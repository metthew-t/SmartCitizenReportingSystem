import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:easy_localization/easy_localization.dart';
import 'package:permission_handler/permission_handler.dart';
import 'login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

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
    if (token == null) return;

    try {
      final response = await http.get(
        Uri.parse('https://smartcitizenreportingsystem.onrender.com/api/v1/auth/me/'),
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
                if (newPwController.text != confirmPwController.text) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Passwords do not match'), backgroundColor: Colors.red));
                  return;
                }
                setDialogState(() => isLoading = true);
                final prefs = await SharedPreferences.getInstance();
                final token = prefs.getString('auth_token');
                try {
                  final response = await http.post(
                    Uri.parse('https://smartcitizenreportingsystem.onrender.com/api/v1/auth/change-password/'),
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
                    Uri.parse('https://smartcitizenreportingsystem.onrender.com/api/v1/auth/delete-account/'),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text('profile_title'.tr(), style: const TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
        backgroundColor: Colors.green[700],
      ),
      body: _isLoading
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
                                      context.setLocale(const Locale('en'));
                                      Navigator.pop(ctx);
                                    },
                                  ),
                                  ListTile(
                                    title: const Text('Afaan Oromo'),
                                    trailing: context.locale.languageCode == 'om' ? const Icon(Icons.check, color: Colors.green) : null,
                                    onTap: () {
                                      context.setLocale(const Locale('om'));
                                      Navigator.pop(ctx);
                                    },
                                  ),
                                  ListTile(
                                    title: const Text('አማርኛ'),
                                    trailing: context.locale.languageCode == 'am' ? const Icon(Icons.check, color: Colors.green) : null,
                                    onTap: () {
                                      context.setLocale(const Locale('am'));
                                      Navigator.pop(ctx);
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
            ),
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
