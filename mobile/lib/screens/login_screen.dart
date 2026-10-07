import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'home_screen.dart';

const String _base = 'https://smartcitizenreportingsystem.onrender.com/api/v1';

// ── Entry point ───────────────────────────────────────────────────────────────

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  // 'login' | 'register_phone' | 'register_otp' | 'register_profile'
  // 'forgot_phone' | 'forgot_otp' | 'forgot_newpass'
  String _mode = 'login';

  // Shared controllers
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();

  // Registration-only controllers
  final _fullNameController = TextEditingController();
  final _nationalIdController = TextEditingController();

  // Forgot password controllers
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  // OTP step state
  String _otpPhone = ''; // phone sent to (normalised)
  bool _otpResendEnabled = false;
  int _resendCountdown = 60;
  Timer? _resendTimer;

  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _obscureNewPassword = true;
  bool _obscureConfirmPassword = true;

  late AnimationController _animController;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      duration: const Duration(milliseconds: 700),
      vsync: this,
    );
    _fadeAnim =
        CurvedAnimation(parent: _animController, curve: Curves.easeOut);
    _animController.forward();
    _checkExistingToken();
  }

  @override
  void dispose() {
    _animController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _fullNameController.dispose();
    _nationalIdController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    _resendTimer?.cancel();
    super.dispose();
  }

  // ── Auto-login ──────────────────────────────────────────────────────────────

  Future<void> _checkExistingToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    if (token == null || !mounted) return;
    try {
      final res = await http.get(
        Uri.parse('$_base/auth/me/'),
        headers: {'Authorization': 'Bearer $token'},
      ).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200 && mounted) {
        _goHome();
      } else {
        await prefs.remove('auth_token');
        await prefs.remove('refresh_token');
      }
    } catch (_) {
      // Network error — allow offline home access
      if (mounted) _goHome();
    }
  }

  void _goHome() {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const HomeScreen()),
    );
  }

  // ── Login flow ──────────────────────────────────────────────────────────────

  Future<void> _handleLogin() async {
    if (_phoneController.text.isEmpty || _passwordController.text.isEmpty) {
      _showError('Phone number and password are required');
      return;
    }
    setState(() => _isLoading = true);
    try {
      final res = await http.post(
        Uri.parse('$_base/auth/login/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phone_number': _phoneController.text.trim(),
          'password': _passwordController.text,
        }),
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        await _saveTokens(data['access'], data['refresh']);
        if (mounted) _goHome();
      } else {
        _showError('Invalid phone number or password');
      }
    } catch (_) {
      _showError('Connection error. Check your internet.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── Registration flow — Step 1: enter phone ─────────────────────────────────

  Future<void> _handleSendOTP() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) {
      _showError('Enter your phone number first');
      return;
    }
    setState(() => _isLoading = true);
    try {
      final res = await http.post(
        Uri.parse('$_base/auth/send-otp/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'phone_number': phone}),
      );
      if (res.statusCode == 200) {
        setState(() {
          _otpPhone = phone;
          _mode = 'register_otp';
        });
        _startResendTimer();
        _showSuccess('OTP sent to $phone');
      } else {
        final body = _safeDecodeError(res.body);
        _showError(body);
      }
    } catch (_) {
      _showError('Connection error. Check your internet.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── Registration flow — Step 2: verify OTP ──────────────────────────────────

  Future<void> _handleVerifyOTP(String otp) async {
    if (otp.length != 6) {
      _showError('Enter the 6-digit code');
      return;
    }
    setState(() => _isLoading = true);
    try {
      final res = await http.post(
        Uri.parse('$_base/auth/verify-otp/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'phone_number': _otpPhone, 'otp': otp}),
      );
      if (res.statusCode == 200) {
        _resendTimer?.cancel();
        if (_mode == 'forgot_otp') {
          setState(() => _mode = 'forgot_newpass');
          _showSuccess('Phone verified! Set your new password.');
        } else {
          setState(() => _mode = 'register_profile');
          _showSuccess('Phone verified! Complete your profile.');
        }
      } else {
        _showError('Incorrect or expired code. Try again.');
      }
    } catch (_) {
      _showError('Connection error. Check your internet.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── Registration flow — Step 3: fill profile & register ─────────────────────

  Future<void> _handleRegister() async {
    if (_fullNameController.text.trim().isEmpty) {
      _showError('Full name is required');
      return;
    }
    final nationalId = _nationalIdController.text.trim();
    if (nationalId.isEmpty) {
      _showError('National ID (FAN) is required');
      return;
    }
    if (nationalId.length != 16 || !RegExp(r'^\d{16}$').hasMatch(nationalId)) {
      _showError('National ID (FAN) must be exactly 16 digits');
      return;
    }
    if (_passwordController.text.length < 4) {
      _showError('Password must be at least 4 characters');
      return;
    }
    setState(() => _isLoading = true);
    try {
      final res = await http.post(
        Uri.parse('$_base/auth/register/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phone_number': _otpPhone,
          'password': _passwordController.text,
          'full_name': _fullNameController.text.trim(),
          'national_id': nationalId,
        }),
      );
      if (res.statusCode == 201) {
        final data = jsonDecode(res.body);
        await _saveTokens(data['access'], data['refresh']);
        if (mounted) {
          _showSuccess('Welcome, ${_fullNameController.text.trim()}!');
          _goHome();
        }
      } else {
        final body = _safeDecodeError(res.body);
        _showError(body);
      }
    } catch (_) {
      _showError('Connection error. Check your internet.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── Forgot Password flow — Step 1: enter phone ─────────────────────────────

  Future<void> _handleForgotSendOTP() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) {
      _showError('Enter your phone number first');
      return;
    }
    setState(() => _isLoading = true);
    try {
      final res = await http.post(
        Uri.parse('$_base/auth/send-otp/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'phone_number': phone, 'is_forgot_password': true}),
      );
      if (res.statusCode == 200) {
        setState(() {
          _otpPhone = phone;
          _mode = 'forgot_otp';
        });
        _startResendTimer();
        _showSuccess('Reset code sent to $phone');
      } else {
        final body = _safeDecodeError(res.body);
        _showError(body);
      }
    } catch (_) {
      _showError('Connection error. Check your internet.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── Forgot Password flow — Step 3: set new password ─────────────────────────

  Future<void> _handleResetPassword() async {
    final newPass = _newPasswordController.text;
    final confirmPass = _confirmPasswordController.text;
    if (newPass.isEmpty) {
      _showError('Enter a new password');
      return;
    }
    if (newPass.length < 6) {
      _showError('Password must be at least 6 characters');
      return;
    }
    if (newPass != confirmPass) {
      _showError('Passwords do not match');
      return;
    }
    setState(() => _isLoading = true);
    try {
      final res = await http.post(
        Uri.parse('$_base/auth/reset-password/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phone_number': _otpPhone,
          'new_password': newPass,
        }),
      );
      if (res.statusCode == 200) {
        _showSuccess('Password reset successfully! Please login.');
        setState(() {
          _mode = 'login';
          _phoneController.text = _otpPhone;
          _passwordController.clear();
          _newPasswordController.clear();
          _confirmPasswordController.clear();
        });
      } else {
        final body = _safeDecodeError(res.body);
        _showError(body);
      }
    } catch (_) {
      _showError('Connection error. Check your internet.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── Resend OTP ──────────────────────────────────────────────────────────────

  Future<void> _handleResendOTP() async {
    if (!_otpResendEnabled) return;
    setState(() {
      _otpResendEnabled = false;
      _isLoading = true;
    });
    final isForgot = _mode == 'forgot_otp';
    try {
      final res = await http.post(
        Uri.parse('$_base/auth/send-otp/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phone_number': _otpPhone,
          if (isForgot) 'is_forgot_password': true,
        }),
      );
      if (res.statusCode == 200) {
        _startResendTimer();
        _showSuccess('New OTP sent to $_otpPhone');
      } else {
        _showError('Failed to resend OTP. Try again.');
        setState(() => _otpResendEnabled = true);
      }
    } catch (_) {
      _showError('Connection error.');
      setState(() => _otpResendEnabled = true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _startResendTimer() {
    _resendTimer?.cancel();
    setState(() {
      _resendCountdown = 60;
      _otpResendEnabled = false;
    });
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) { t.cancel(); return; }
      setState(() {
        _resendCountdown--;
        if (_resendCountdown <= 0) {
          _otpResendEnabled = true;
          t.cancel();
        }
      });
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  Future<void> _saveTokens(String access, String refresh) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', access);
    await prefs.setString('refresh_token', refresh);
    try {
      final meRes = await http.get(
        Uri.parse('$_base/auth/me/'),
        headers: {'Authorization': 'Bearer $access'},
      );
      if (meRes.statusCode == 200) {
        final me = jsonDecode(meRes.body);
        await prefs.setInt('user_id', me['id']);
      }
    } catch (_) {}
  }

  String _safeDecodeError(String body) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map) {
        final val = decoded['error'] ?? decoded['detail'] ?? decoded.values.first;
        return val is List ? val.first.toString() : val.toString();
      }
    } catch (_) {}
    return 'Something went wrong. Please try again.';
  }

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: Colors.red[700],
    ));
  }

  void _showSuccess(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: Colors.green[700],
    ));
  }

  // ── Build ────────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          image: DecorationImage(
            image: AssetImage('assets/images/adama_bg.jpg'),
            fit: BoxFit.cover,
            colorFilter:
                ColorFilter.mode(Colors.black54, BlendMode.darken),
          ),
        ),
        child: SafeArea(
          child: FadeTransition(
            opacity: _fadeAnim,
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 40),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 20),
                  _buildLogo(),
                  const SizedBox(height: 28),
                  _buildCard(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ── Logo ─────────────────────────────────────────────────────────────────────

  Widget _buildLogo() {
    return Column(
      children: [
        Center(
          child: Container(
            width: 90,
            height: 90,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Image.asset(
                'assets/images/app_icon.jpg',
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Icon(Icons.location_city,
                      size: 48, color: Colors.white),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),
        const Text(
          'Adama Smart Citizen',
          textAlign: TextAlign.center,
          style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white),
        ),
        const SizedBox(height: 4),
        Text(
          'Citizen Reporting System',
          textAlign: TextAlign.center,
          style: TextStyle(
              fontSize: 13, color: Colors.white.withValues(alpha: 0.75)),
        ),
      ],
    );
  }

  // ── White card container ──────────────────────────────────────────────────────

  Widget _buildCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 30,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 300),
        transitionBuilder: (child, anim) =>
            FadeTransition(opacity: anim, child: child),
        child: KeyedSubtree(
          key: ValueKey(_mode),
          child: _buildCurrentStep(),
        ),
      ),
    );
  }

  Widget _buildCurrentStep() {
    switch (_mode) {
      case 'register_phone':
        return _buildRegisterPhoneStep();
      case 'register_otp':
        return _buildOTPStep();
      case 'register_profile':
        return _buildProfileStep();
      case 'forgot_phone':
        return _buildForgotPhoneStep();
      case 'forgot_otp':
        return _buildForgotOTPStep();
      case 'forgot_newpass':
        return _buildForgotNewPassStep();
      default:
        return _buildLoginStep();
    }
  }

  // ── Step: Login ───────────────────────────────────────────────────────────────

  Widget _buildLoginStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildModeTabs(),
        const SizedBox(height: 24),
        _buildStepHeader(
          title: 'Welcome Back',
          subtitle: 'Sign in to report & track incidents',
        ),
        const SizedBox(height: 20),
        _buildPhoneField(),
        const SizedBox(height: 14),
        _buildPasswordField(),
        const SizedBox(height: 8),
        // Forgot Password Link
        Align(
          alignment: Alignment.centerRight,
          child: GestureDetector(
            onTap: () {
              setState(() {
                _mode = 'forgot_phone';
                _passwordController.clear();
              });
            },
            child: Text(
              'Forgot Password?',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Colors.green[700],
              ),
            ),
          ),
        ),
        const SizedBox(height: 18),
        _buildPrimaryButton(
          label: 'Sign In',
          onPressed: _handleLogin,
        ),
      ],
    );
  }

  // ── Step: Register — enter phone ──────────────────────────────────────────────

  Widget _buildRegisterPhoneStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildModeTabs(),
        const SizedBox(height: 24),
        _buildStepHeader(
          title: 'Create Account',
          subtitle: 'We\'ll send a 6-digit code to verify your number',
        ),
        const SizedBox(height: 6),
        // Progress indicator
        _buildStepProgress(current: 1, total: 3),
        const SizedBox(height: 20),
        _buildPhoneField(),
        const SizedBox(height: 24),
        _buildPrimaryButton(
          label: 'Send Verification Code',
          icon: Icons.sms_outlined,
          onPressed: _handleSendOTP,
        ),
      ],
    );
  }

  // ── Step: Register — enter OTP ────────────────────────────────────────────────

  Widget _buildOTPStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Back button
        Row(
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back_ios_new, size: 18),
              onPressed: () => setState(() {
                _mode = 'register_phone';
                _resendTimer?.cancel();
              }),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
            const SizedBox(width: 4),
            Text('Back', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
          ],
        ),
        const SizedBox(height: 12),
        _buildStepHeader(
          title: 'Enter Verification Code',
          subtitle: 'Sent via SMS to $_otpPhone',
        ),
        const SizedBox(height: 6),
        _buildStepProgress(current: 2, total: 3),
        const SizedBox(height: 28),

        // 6-box OTP input
        _OTPInputField(
          onCompleted: _handleVerifyOTP,
          isLoading: _isLoading,
        ),
        const SizedBox(height: 24),

        // Resend row
        _buildResendRow(),
        const SizedBox(height: 8),
      ],
    );
  }

  // ── Step: Register — complete profile ────────────────────────────────────────

  Widget _buildProfileStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back_ios_new, size: 18),
              onPressed: () => setState(() => _mode = 'register_otp'),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
            const SizedBox(width: 4),
            Text('Back', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
          ],
        ),
        const SizedBox(height: 12),
        // Phone verified badge
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.green[50],
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.green[200]!),
          ),
          child: Row(
            children: [
              Icon(Icons.verified, color: Colors.green[700], size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '$_otpPhone verified',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Colors.green[800],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _buildStepHeader(
          title: 'Complete Your Profile',
          subtitle: 'Almost there — just a few more details',
        ),
        const SizedBox(height: 6),
        _buildStepProgress(current: 3, total: 3),
        const SizedBox(height: 20),

        // Full name
        TextField(
          controller: _fullNameController,
          textCapitalization: TextCapitalization.words,
          decoration: InputDecoration(
            labelText: 'Full Name *',
            hintText: 'Enter your full name',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            prefixIcon: const Icon(Icons.person_outline),
          ),
        ),
        const SizedBox(height: 14),

        // National ID (FAN) - REQUIRED
        TextField(
          controller: _nationalIdController,
          keyboardType: TextInputType.number,
          maxLength: 16,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: InputDecoration(
            labelText: 'National ID (FAN) *',
            hintText: 'e.g. 1234567890123456',
            helperText: 'FAN — 16 digits required',
            helperMaxLines: 2,
            counterText: '',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            prefixIcon: const Icon(Icons.badge_outlined),
          ),
        ),
        const SizedBox(height: 6),
        // FAN info box
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Colors.blue[50],
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.blue[200]!),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.info_outline, color: Colors.blue[700], size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Your FAN number is 16 digits found on your national ID card. '
                  'Example: 1234567890123456',
                  style: TextStyle(fontSize: 12, color: Colors.blue[800], height: 1.4),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Password
        _buildPasswordField(label: 'Create Password'),
        const SizedBox(height: 24),

        _buildPrimaryButton(
          label: 'Create Account',
          icon: Icons.check_circle_outline,
          onPressed: _handleRegister,
        ),
      ],
    );
  }

  // ── Forgot Password — Step 1: enter phone ─────────────────────────────────

  Widget _buildForgotPhoneStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back_ios_new, size: 18),
              onPressed: () => setState(() {
                _mode = 'login';
                _phoneController.clear();
              }),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
            const SizedBox(width: 4),
            Text('Back to Login', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
          ],
        ),
        const SizedBox(height: 12),
        _buildStepHeader(
          title: 'Forgot Password',
          subtitle: 'Enter your registered phone number to receive a reset code',
        ),
        const SizedBox(height: 6),
        _buildStepProgress(current: 1, total: 3),
        const SizedBox(height: 20),
        _buildPhoneField(),
        const SizedBox(height: 24),
        _buildPrimaryButton(
          label: 'Send Reset Code',
          icon: Icons.sms_outlined,
          onPressed: _handleForgotSendOTP,
        ),
      ],
    );
  }

  // ── Forgot Password — Step 2: enter OTP ─────────────────────────────────────

  Widget _buildForgotOTPStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back_ios_new, size: 18),
              onPressed: () => setState(() {
                _mode = 'forgot_phone';
                _resendTimer?.cancel();
              }),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
            const SizedBox(width: 4),
            Text('Back', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
          ],
        ),
        const SizedBox(height: 12),
        _buildStepHeader(
          title: 'Enter Reset Code',
          subtitle: 'Sent via SMS to $_otpPhone',
        ),
        const SizedBox(height: 6),
        _buildStepProgress(current: 2, total: 3),
        const SizedBox(height: 28),

        _OTPInputField(
          onCompleted: _handleVerifyOTP,
          isLoading: _isLoading,
        ),
        const SizedBox(height: 24),

        _buildResendRow(),
        const SizedBox(height: 8),
      ],
    );
  }

  // ── Forgot Password — Step 3: set new password ──────────────────────────────

  Widget _buildForgotNewPassStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 8),
        // Phone verified badge
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.green[50],
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.green[200]!),
          ),
          child: Row(
            children: [
              Icon(Icons.verified, color: Colors.green[700], size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '$_otpPhone verified',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Colors.green[800],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _buildStepHeader(
          title: 'Set New Password',
          subtitle: 'Choose a new password for your account',
        ),
        const SizedBox(height: 6),
        _buildStepProgress(current: 3, total: 3),
        const SizedBox(height: 20),

        // New password
        TextField(
          controller: _newPasswordController,
          obscureText: _obscureNewPassword,
          decoration: InputDecoration(
            labelText: 'New Password',
            hintText: 'At least 6 characters',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            prefixIcon: const Icon(Icons.lock_outline),
            suffixIcon: IconButton(
              icon: Icon(_obscureNewPassword ? Icons.visibility_off : Icons.visibility),
              onPressed: () => setState(() => _obscureNewPassword = !_obscureNewPassword),
            ),
          ),
        ),
        const SizedBox(height: 14),

        // Confirm password
        TextField(
          controller: _confirmPasswordController,
          obscureText: _obscureConfirmPassword,
          decoration: InputDecoration(
            labelText: 'Confirm Password',
            hintText: 'Re-enter your new password',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            prefixIcon: const Icon(Icons.lock_outline),
            suffixIcon: IconButton(
              icon: Icon(_obscureConfirmPassword ? Icons.visibility_off : Icons.visibility),
              onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
            ),
          ),
        ),
        const SizedBox(height: 24),

        _buildPrimaryButton(
          label: 'Reset Password',
          icon: Icons.check_circle_outline,
          onPressed: _handleResetPassword,
        ),
      ],
    );
  }

  // ── Shared UI pieces ──────────────────────────────────────────────────────────

  Widget _buildResendRow() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          "Didn't receive the code? ",
          style: TextStyle(fontSize: 13, color: Colors.grey[600]),
        ),
        GestureDetector(
          onTap: _otpResendEnabled ? _handleResendOTP : null,
          child: Text(
            _otpResendEnabled
                ? 'Resend'
                : 'Resend in ${_resendCountdown}s',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: _otpResendEnabled
                  ? Colors.green[700]
                  : Colors.grey[400],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildModeTabs() {
    final isLogin = _mode == 'login';
    return Container(
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
      ),
      padding: const EdgeInsets.all(4),
      child: Row(
        children: [
          _buildTab('Login', isLogin, () {
            setState(() {
              _mode = 'login';
              _resendTimer?.cancel();
            });
          }),
          _buildTab('Register', !isLogin, () {
            setState(() {
              _mode = 'register_phone';
            });
          }),
        ],
      ),
    );
  }

  Widget _buildTab(String label, bool active, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: active ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: active
                ? [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 5)]
                : null,
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: active ? Colors.green[700] : Colors.grey[500],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStepHeader({required String title, required String subtitle}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(subtitle, style: TextStyle(fontSize: 13, color: Colors.grey[600])),
      ],
    );
  }

  Widget _buildStepProgress({required int current, required int total}) {
    return Row(
      children: List.generate(total, (i) {
        final active = i < current;
        final isCurrent = i == current - 1;
        return Expanded(
          child: Container(
            margin: EdgeInsets.only(right: i < total - 1 ? 6 : 0),
            height: 4,
            decoration: BoxDecoration(
              color: active
                  ? (isCurrent ? Colors.green[700] : Colors.green[300])
                  : Colors.grey[200],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildPhoneField() {
    return TextField(
      controller: _phoneController,
      keyboardType: TextInputType.phone,
      decoration: InputDecoration(
        labelText: 'Phone Number',
        hintText: '09xxxxxxxx',
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        prefixIcon: const Icon(Icons.phone_outlined),
      ),
    );
  }

  Widget _buildPasswordField({String label = 'Password'}) {
    return TextField(
      controller: _passwordController,
      obscureText: _obscurePassword,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        prefixIcon: const Icon(Icons.lock_outline),
        suffixIcon: IconButton(
          icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
          onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
        ),
      ),
    );
  }

  Widget _buildPrimaryButton({
    required String label,
    required VoidCallback onPressed,
    IconData? icon,
  }) {
    return ElevatedButton(
      onPressed: _isLoading ? null : onPressed,
      style: ElevatedButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 16),
        backgroundColor: Colors.green[700],
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 0,
      ),
      child: _isLoading
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                  strokeWidth: 2, color: Colors.white),
            )
          : Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 18),
                  const SizedBox(width: 8),
                ],
                Text(label,
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w600)),
              ],
            ),
    );
  }
}

// ── OTP 6-box input widget ────────────────────────────────────────────────────

class _OTPInputField extends StatefulWidget {
  final void Function(String otp) onCompleted;
  final bool isLoading;

  const _OTPInputField({required this.onCompleted, required this.isLoading});

  @override
  State<_OTPInputField> createState() => _OTPInputFieldState();
}

class _OTPInputFieldState extends State<_OTPInputField> {
  static const int _length = 6;
  final List<TextEditingController> _controllers =
      List.generate(_length, (_) => TextEditingController());
  final List<FocusNode> _focusNodes =
      List.generate(_length, (_) => FocusNode());

  @override
  void dispose() {
    for (final c in _controllers) c.dispose();
    for (final f in _focusNodes) f.dispose();
    super.dispose();
  }

  void _onChanged(String value, int index) {
    if (value.isEmpty) {
      // Backspace — move back
      if (index > 0) _focusNodes[index - 1].requestFocus();
      return;
    }
    // If user pastes all 6 digits into first box
    if (value.length == _length && index == 0) {
      for (int i = 0; i < _length; i++) {
        _controllers[i].text = value[i];
      }
      _focusNodes[_length - 1].requestFocus();
      _submit();
      return;
    }
    // Normal single digit
    _controllers[index].text = value[value.length - 1];
    if (index < _length - 1) {
      _focusNodes[index + 1].requestFocus();
    } else {
      _focusNodes[index].unfocus();
      _submit();
    }
  }

  void _submit() {
    final otp = _controllers.map((c) => c.text).join();
    if (otp.length == _length) {
      widget.onCompleted(otp);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: List.generate(_length, (i) {
        return SizedBox(
          width: 46,
          height: 56,
          child: TextField(
            controller: _controllers[i],
            focusNode: _focusNodes[i],
            enabled: !widget.isLoading,
            textAlign: TextAlign.center,
            keyboardType: TextInputType.number,
            maxLength: _length, // allows paste of full code into first box
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            decoration: InputDecoration(
              counterText: '',
              filled: true,
              fillColor: Colors.grey[100],
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey[300]!),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.green[700]!, width: 2),
              ),
              contentPadding: EdgeInsets.zero,
            ),
            onChanged: (v) => _onChanged(v, i),
          ),
        );
      }),
    );
  }
}
