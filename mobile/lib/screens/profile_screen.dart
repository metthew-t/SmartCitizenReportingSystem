import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:easy_localization/easy_localization.dart';
import 'package:permission_handler/permission_handler.dart';
import '../services/api_config.dart';
import 'login_screen.dart';

class ProfileScreen extends StatefulWidget {
  /// If true, renders without its own Scaffold (for use inside IndexedStack).
  final bool embedded;
  const ProfileScreen({super.key, this.embedded = false});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String _fullName = '';
  String _phone = '';
  bool _isLoading = true;
  bool _notificationsEnabled = true;

  @override
  void initState() {
    super.initState();
    _fetchProfile();
  }

  Future<void> _fetchProfile() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');

    if (token == null) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/auth/me/'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            _fullName = data['full_name'] ?? data['phone_number'] ?? '';
            _phone = data['phone_number'] ?? '';
            _isLoading = false;
          });
        }
      } else if (response.statusCode == 401) {
        // Token expired — clear and redirect to login
        await prefs.remove('auth_token');
        await prefs.remove('refresh_token');
        if (mounted) {
          setState(() => _isLoading = false);
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (_) => const LoginScreen()),
            (route) => false,
          );
        }
      } else {
        if (mounted) setState(() => _isLoading = false);
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Logout', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('refresh_token');

    if (mounted) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen()),
        (route) => false,
      );
    }
  }

  void _showChangePasswordDialog(BuildContext context) {
    final oldPwController = TextEditingController();
    final newPwController = TextEditingController();
    final confirmPwController = TextEditingController();
    bool isLoading = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text('change_password'.tr()),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: oldPwController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Current Password',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: newPwController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'New Password',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: confirmPwController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Confirm New Password',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: isLoading ? null : () async {
                final newPw = newPwController.text;
                if (newPw.length < 12 ||
                    !RegExp(r'[A-Z]').hasMatch(newPw) ||
                    !RegExp(r'[a-z]').hasMatch(newPw) ||
                    !RegExp(r'[0-9]').hasMatch(newPw) ||
                    !RegExp(r'[^A-Za-z0-9]').hasMatch(newPw)) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                    content: Text('Government Standard: Password must be 12+ characters with uppercase, lowercase, number, and symbol.'),
                    backgroundColor: Colors.red,
                    duration: Duration(seconds: 4),
                  ));
                  return;
                }
                if (newPw != confirmPwController.text) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Passwords do not match'), backgroundColor: Colors.red));
                  return;
                }
                setDialogState(() => isLoading = true);
                final prefs = await SharedPreferences.getInstance();
                final token = prefs.getString('auth_token');
                try {
                  final response = await http.post(
                    Uri.parse('${ApiConfig.baseUrl}/auth/change-password/'),
                    headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
                    body: jsonEncode({'old_password': oldPwController.text, 'new_password': newPwController.text}),
                  );
                  if (!ctx.mounted) return;
                  Navigator.pop(ctx);
                  if (response.statusCode == 200) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password changed successfully!'), backgroundColor: Colors.green));
                  } else {
                    final err = jsonDecode(response.body)['error'] ?? 'Failed to change password';
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: Colors.red));
                  }
                } catch (e) {
                  if (ctx.mounted) Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
              child: isLoading ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  void _showDeleteAccountDialog(BuildContext context) {
    final pwController = TextEditingController();
    bool isLoading = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Delete Account', style: TextStyle(color: Colors.red)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('This action is irreversible. Enter your password to confirm.', style: TextStyle(color: Colors.black54)),
              const SizedBox(height: 12),
              TextField(
                controller: pwController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: isLoading ? null : () async {
                setDialogState(() => isLoading = true);
                final prefs = await SharedPreferences.getInstance();
                final token = prefs.getString('auth_token');
                try {
                  final response = await http.delete(
                    Uri.parse('${ApiConfig.baseUrl}/auth/delete-account/'),
                    headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
                    body: jsonEncode({'password': pwController.text}),
                  );
                  if (!ctx.mounted) return;
                  Navigator.pop(ctx);
                  if (response.statusCode == 200) {
                    await prefs.clear();
                    if (mounted) {
                      Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_) => const LoginScreen()), (r) => false);
                    }
                  } else {
                    final err = jsonDecode(response.body)['error'] ?? 'Failed to delete account';
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err), backgroundColor: Colors.red));
                  }
                } catch (e) {
                  if (ctx.mounted) Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              child: isLoading ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Delete', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  void _showSocialMediaNotificationsDialog(BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');

    final telegramController = TextEditingController();
    final whatsappController = TextEditingController();
    bool notifyTelegram = false;
    bool notifyWhatsapp = false;
    bool notifyInApp = true;
    bool notifySms = true;
    bool isFetching = true;
    bool isSaving = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          if (isFetching) {
            http.get(
              Uri.parse('${ApiConfig.baseUrl}/auth/social-notifications/'),
              headers: {'Authorization': 'Bearer $token'},
            ).then((res) {
              if (res.statusCode == 200) {
                final d = jsonDecode(res.body);
                setDialogState(() {
                  telegramController.text = d['telegram_chat_id'] ?? '';
                  whatsappController.text = d['whatsapp_phone_number'] ?? '';
                  notifyTelegram = d['notify_via_telegram'] == true;
                  notifyWhatsapp = d['notify_via_whatsapp'] == true;
                  notifyInApp = d['notify_via_in_app'] != false;
                  notifySms = d['notify_via_sms'] != false;
                  isFetching = false;
                });
              } else {
                setDialogState(() => isFetching = false);
              }
            }).catchError((_) {
              setDialogState(() => isFetching = false);
            });
          }

          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Row(
              children: [
                Icon(Icons.share_rounded, color: Colors.blue[700]),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text('Social Media Alerts', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            content: isFetching
                ? const SizedBox(height: 120, child: Center(child: CircularProgressIndicator()))
                : SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Connect your Telegram or WhatsApp to receive instant civic updates on report status, assignments, and appeals.',
                          style: TextStyle(fontSize: 12, color: Colors.black54),
                        ),
                        const SizedBox(height: 16),

                        // Telegram Section
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.blue[50],
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.blue[200]!),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.send_rounded, size: 18, color: Colors.blue),
                                  const SizedBox(width: 8),
                                  const Text('Telegram Notifications', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blue)),
                                  const Spacer(),
                                  Switch(
                                    value: notifyTelegram,
                                    onChanged: (v) => setDialogState(() => notifyTelegram = v),
                                  ),
                                ],
                              ),
                              TextField(
                                controller: telegramController,
                                decoration: const InputDecoration(
                                  labelText: 'Telegram Chat ID or Username',
                                  hintText: 'e.g. 123456789 or your_username',
                                  isDense: true,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Tip: Start @AdamaSmartCitizenBot on Telegram to get your Chat ID.',
                                style: TextStyle(fontSize: 11, color: Colors.blue[900]),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 14),

                        // WhatsApp Section
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.green[50],
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.green[200]!),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.chat_bubble_rounded, size: 18, color: Colors.green),
                                  const SizedBox(width: 8),
                                  const Text('WhatsApp Notifications', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.green)),
                                  const Spacer(),
                                  Switch(
                                    value: notifyWhatsapp,
                                    onChanged: (v) => setDialogState(() => notifyWhatsapp = v),
                                  ),
                                ],
                              ),
                              TextField(
                                controller: whatsappController,
                                keyboardType: TextInputType.phone,
                                decoration: const InputDecoration(
                                  labelText: 'WhatsApp Phone Number',
                                  hintText: '+2519xxxxxxxx',
                                  isDense: true,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 14),

                        // In-app & SMS
                        CheckboxListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('In-App & Bell Notifications', style: TextStyle(fontSize: 13)),
                          value: notifyInApp,
                          onChanged: (v) => setDialogState(() => notifyInApp = v ?? true),
                        ),
                        CheckboxListTile(
                          contentPadding: EdgeInsets.zero,
                          title: const Text('SMS Text Notifications', style: TextStyle(fontSize: 13)),
                          value: notifySms,
                          onChanged: (v) => setDialogState(() => notifySms = v ?? true),
                        ),
                      ],
                    ),
                  ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: isSaving
                    ? null
                    : () async {
                        setDialogState(() => isSaving = true);
                        try {
                          final res = await http.post(
                            Uri.parse('${ApiConfig.baseUrl}/auth/social-notifications/'),
                            headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
                            body: jsonEncode({
                              'telegram_chat_id': telegramController.text.trim(),
                              'whatsapp_phone_number': whatsappController.text.trim(),
                              'notify_via_telegram': notifyTelegram,
                              'notify_via_whatsapp': notifyWhatsapp,
                              'notify_via_in_app': notifyInApp,
                              'notify_via_sms': notifySms,
                              'test_channel': notifyTelegram ? 'telegram' : (notifyWhatsapp ? 'whatsapp' : null),
                            }),
                          );
                          if (ctx.mounted) Navigator.pop(ctx);
                          if (res.statusCode == 200) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Social notification preferences saved & connected!'), backgroundColor: Colors.green),
                            );
                          }
                        } catch (e) {
                          if (ctx.mounted) Navigator.pop(ctx);
                        }
                      },
                style: ElevatedButton.styleFrom(backgroundColor: Colors.green[700]),
                child: isSaving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text('Save Settings'),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildBody(BuildContext context) {
    return _isLoading
        ? const Center(child: CircularProgressIndicator())
        : CustomScrollView(
            slivers: [
                SliverToBoxAdapter(
                  child: Stack(
                    clipBehavior: Clip.none,
                    alignment: Alignment.center,
                    children: [
                      Container(
                        height: 140,
                        decoration: BoxDecoration(
                          color: Colors.green[700],
                          borderRadius: const BorderRadius.only(
                            bottomLeft: Radius.circular(30),
                            bottomRight: Radius.circular(30),
                          ),
                        ),
                      ),
                      Positioned(
                        top: 60,
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 5))
                            ],
                          ),
                          child: CircleAvatar(
                            radius: 50,
                            backgroundColor: Colors.green[100],
                            child: Text(
                              _fullName.isNotEmpty ? _fullName[0].toUpperCase() : '?',
                              style: TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: Colors.green[800]),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                SliverToBoxAdapter(
                  child: const SizedBox(height: 70),
                ),
                SliverToBoxAdapter(
                  child: Column(
                    children: [
                      Text(
                        _fullName,
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.green[50],
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          _phone,
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.green[800]),
                        ),
                      ),
                      const SizedBox(height: 20),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _ProfileStat(icon: Icons.verified_user, label: 'verified'.tr(), color: Colors.blue),
                          const SizedBox(width: 20),
                          _ProfileStat(icon: Icons.star_border, label: 'active_citizen'.tr(), color: Colors.amber),
                        ],
                      ),
                      const SizedBox(height: 30),
                    ],
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      Text('preferences'.tr(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black54)),
                      const SizedBox(height: 12),
                      _SettingsTile(
                        icon: Icons.language,
                        title: 'language'.tr(),
                        subtitle: 'language_subtitle'.tr(),
                        iconColor: Colors.purple,
                        onTap: () {
                          // Capture outer context before dialog
                          final outerContext = context;
                          showDialog(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: Text('select_language'.tr()),
                              content: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  ListTile(
                                    title: const Text('English'),
                                    trailing: context.locale.languageCode == 'en' ? const Icon(Icons.check, color: Colors.green) : null,
                                    onTap: () {
                                      Navigator.pop(ctx);
                                      // Defer locale change to after dialog is fully dismissed
                                      WidgetsBinding.instance.addPostFrameCallback((_) {
                                        if (outerContext.mounted) {
                                          outerContext.setLocale(const Locale('en'));
                                        }
                                      });
                                    },
                                  ),
                                  ListTile(
                                    title: const Text('Afaan Oromo'),
                                    trailing: context.locale.languageCode == 'om' ? const Icon(Icons.check, color: Colors.green) : null,
                                    onTap: () {
                                      Navigator.pop(ctx);
                                      WidgetsBinding.instance.addPostFrameCallback((_) {
                                        if (outerContext.mounted) {
                                          outerContext.setLocale(const Locale('om'));
                                        }
                                      });
                                    },
                                  ),
                                  ListTile(
                                    title: const Text('አማርኛ'),
                                    trailing: context.locale.languageCode == 'am' ? const Icon(Icons.check, color: Colors.green) : null,
                                    onTap: () {
                                      Navigator.pop(ctx);
                                      WidgetsBinding.instance.addPostFrameCallback((_) {
                                        if (outerContext.mounted) {
                                          outerContext.setLocale(const Locale('am'));
                                        }
                                      });
                                    },
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                      _SettingsTile(
                        icon: Icons.notifications_active,
                        title: 'notifications'.tr(),
                        subtitle: _notificationsEnabled ? 'push_alerts_enabled'.tr() : 'push_alerts_disabled'.tr(),
                        iconColor: Colors.orange,
                        trailing: Switch(
                          value: _notificationsEnabled, 
                          activeColor: Colors.green, 
                          onChanged: (v) {
                            setState(() {
                              _notificationsEnabled = v;
                            });
                          }
                        ),
                        onTap: () {
                          setState(() {
                            _notificationsEnabled = !_notificationsEnabled;
                          });
                        },
                      ),
                      _SettingsTile(
                        icon: Icons.share_rounded,
                        title: 'Social Media Alerts',
                        subtitle: 'Connect Telegram & WhatsApp notifications',
                        iconColor: Colors.teal,
                        onTap: () => _showSocialMediaNotificationsDialog(context),
                      ),
                      _SettingsTile(
                        icon: Icons.security,
                        title: 'privacy_security'.tr(),
                        subtitle: 'manage_data'.tr(),
                        iconColor: Colors.blue,
                        onTap: () {
                          showDialog(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: Text('privacy_security'.tr()),
                              content: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  ListTile(
                                    leading: const Icon(Icons.lock_outline, color: Colors.blue),
                                    title: Text('change_password'.tr()),
                                    onTap: () {
                                      Navigator.pop(ctx);
                                      _showChangePasswordDialog(context);
                                    },
                                  ),
                                  ListTile(
                                    leading: const Icon(Icons.location_on_outlined, color: Colors.green),
                                    title: Text('location_permission'.tr()),
                                    onTap: () {
                                      Navigator.pop(ctx);
                                      openAppSettings();
                                    },
                                  ),
                                  ListTile(
                                    leading: const Icon(Icons.camera_alt_outlined, color: Colors.orange),
                                    title: Text('camera_permission'.tr()),
                                    onTap: () {
                                      Navigator.pop(ctx);
                                      openAppSettings();
                                    },
                                  ),
                                  ListTile(
                                    leading: const Icon(Icons.delete_outline, color: Colors.red),
                                    title: Text('delete_account'.tr(), style: const TextStyle(color: Colors.red)),
                                    onTap: () {
                                      Navigator.pop(ctx);
                                      _showDeleteAccountDialog(context);
                                    },
                                  ),
                                ],
                              ),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close'))
                              ],
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 24),
                      Text('support'.tr(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black54)),
                      const SizedBox(height: 12),
                      _SettingsTile(
                        icon: Icons.help_outline,
                        title: 'help_center'.tr(),
                        subtitle: 'help_center_subtitle'.tr(),
                        iconColor: Colors.teal,
                        onTap: () {
                          showDialog(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: Text('help_center'.tr()),
                              content: const Text('If you need help, please call 911 for emergencies or visit our local office for non-emergency issues.'),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))
                              ],
                            ),
                          );
                        },
                      ),
                      _SettingsTile(
                        icon: Icons.info_outline,
                        title: 'about_app'.tr(),
                        subtitle: 'about_app_subtitle'.tr(),
                        iconColor: Colors.indigo,
                        onTap: () {
                          showDialog(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: Text('about_app'.tr()),
                              content: const Text('Adama Smart Citizen Reporting System.\nVersion: 1.0.0\nDeveloped to improve citizen engagement and infrastructure reporting in Adama.'),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))
                              ],
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 24),
                      InkWell(
                        onTap: _handleLogout,
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.red[50],
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.red[100]!),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.logout, color: Colors.red[700]),
                              const SizedBox(width: 8),
                              Text('log_out'.tr(), style: TextStyle(color: Colors.red[700], fontSize: 16, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 40),
                    ]),
                  ),
                ),
            ],
          );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.embedded) {
      // Embedded inside IndexedStack — no Scaffold to avoid nesting
      return Column(
        children: [
          AppBar(
            automaticallyImplyLeading: false,
            title: Text('profile_title'.tr(), style: const TextStyle(fontWeight: FontWeight.bold)),
            elevation: 0,
            backgroundColor: Colors.green[700],
            foregroundColor: Colors.white,
          ),
          Expanded(child: _buildBody(context)),
        ],
      );
    }
    // Standalone — full Scaffold with AppBar
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text('profile_title'.tr(), style: const TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
        backgroundColor: Colors.green[700],
        foregroundColor: Colors.white,
      ),
      body: _buildBody(context),
    );
  }
}

class _ProfileStat extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _ProfileStat({required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: color),
        const SizedBox(width: 6),
        Text(label, style: TextStyle(fontWeight: FontWeight.w600, color: Colors.grey[700])),
      ],
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color iconColor;
  final Widget? trailing;
  final VoidCallback onTap;

  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.iconColor,
    this.trailing,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 10, offset: const Offset(0, 4))
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: iconColor),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(subtitle, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
        trailing: trailing ?? Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey[400]),
        onTap: onTap,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}
