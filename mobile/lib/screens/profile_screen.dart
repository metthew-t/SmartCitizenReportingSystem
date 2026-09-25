import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Profile & Settings', style: TextStyle(fontWeight: FontWeight.bold)),
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
                          _ProfileStat(icon: Icons.verified_user, label: 'Verified', color: Colors.blue),
                          const SizedBox(width: 20),
                          _ProfileStat(icon: Icons.star_border, label: 'Active Citizen', color: Colors.amber),
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
                      const Text('Preferences', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black54)),
                      const SizedBox(height: 12),
                      _SettingsTile(
                        icon: Icons.language,
                        title: 'Language',
                        subtitle: 'English / Afaan Oromo',
                        iconColor: Colors.purple,
                        onTap: () {
                          showDialog(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: const Text('Select Language'),
                              content: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  ListTile(
                                    title: const Text('English'),
                                    trailing: const Icon(Icons.check, color: Colors.green),
                                    onTap: () => Navigator.pop(ctx),
                                  ),
                                  ListTile(
                                    title: const Text('Afaan Oromo'),
                                    onTap: () => Navigator.pop(ctx),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                      _SettingsTile(
                        icon: Icons.notifications_active,
                        title: 'Notifications',
                        subtitle: _notificationsEnabled ? 'Push alerts enabled' : 'Push alerts disabled',
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
                        title: 'Privacy & Security',
                        subtitle: 'Manage your data',
                        iconColor: Colors.blue,
                        onTap: () {
                          showDialog(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: const Text('Privacy & Security'),
                              content: const Text('All your data is securely encrypted. Manage your privacy settings here.'),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))
                              ],
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 24),
                      const Text('Support', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black54)),
                      const SizedBox(height: 12),
                      _SettingsTile(
                        icon: Icons.help_outline,
                        title: 'Help Center',
                        subtitle: 'FAQs and support',
                        iconColor: Colors.teal,
                        onTap: () {
                          showDialog(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: const Text('Help Center'),
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
                        title: 'About App',
                        subtitle: 'Adama Smart Citizen v1.0',
                        iconColor: Colors.indigo,
                        onTap: () {
                          showDialog(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: const Text('About App'),
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
                              Text('Log Out', style: TextStyle(color: Colors.red[700], fontSize: 16, fontWeight: FontWeight.bold)),
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
