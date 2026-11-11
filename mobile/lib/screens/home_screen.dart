import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:easy_localization/easy_localization.dart';
import '../services/api_config.dart';
import '../services/database_helper.dart';
import '../services/sync_service.dart';
import '../theme.dart';
import 'submit_report_screen.dart';
import 'report_details_screen.dart';
import 'profile_screen.dart';
import 'citizen_ai_screen.dart';
import 'appeals_screen.dart';

/// Report data model (for both local and API reports)
class ReportItem {
  final String id;
  final String caseNumber;
  final String title;
  final String description;
  final String status;
  final String priority;
  final String department;
  final String category;
  final DateTime createdAt;
  final String citizenName;
  final LatLng location;

  // SLA fields (Feature 1)
  final double? slaHoursRemaining;
  final bool isSlaBreached;

  // Community (Feature 2)
  final int affectedCount;

  // Geofence (Feature 6)
  final bool isWithinGeofence;

  const ReportItem({
    required this.id,
    required this.caseNumber,
    required this.title,
    required this.description,
    required this.status,
    required this.priority,
    required this.department,
    required this.category,
    required this.createdAt,
    this.citizenName = 'You',
    this.location = const LatLng(8.5400, 39.2700),
    this.slaHoursRemaining,
    this.isSlaBreached = false,
    this.affectedCount = 1,
    this.isWithinGeofence = true,
  });
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  List<ReportItem> _reports = [];
  bool _isLoading = true;
  int _pendingOfflineCount = 0;

  @override
  void initState() {
    super.initState();
    // 1. Immediately load cached & offline queued reports for instant zero-latency UI
    _loadLocalReports();
    // 2. Fetch fresh server data in background
    _fetchReports();
    // 3. Start offline auto-sync engine
    SyncService().startPeriodicSync();
    SyncService().pendingCountStream.listen((count) {
      if (mounted) setState(() => _pendingOfflineCount = count);
    });
    // 4. Real-time Telegram-style notification when pending report is synced
    SyncService().syncedReportStream.listen((event) {
      if (mounted) {
        _loadLocalReports();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(children: [
              const Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Report synced to Adama Municipal server! Case: ${event['case_number']}',
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                ),
              ),
            ]),
            backgroundColor: Colors.green[700],
            duration: const Duration(seconds: 4),
          ),
        );
      }
    });
    _loadPendingCount();
  }

  Future<void> _loadPendingCount() async {
    final count = await SyncService().getPendingCount();
    if (mounted) setState(() => _pendingOfflineCount = count);
  }

  Future<void> _loadLocalReports() async {
    try {
      final combined = await DatabaseHelper().getAllReportsForDisplay();
      if (combined.isNotEmpty && mounted) {
        final parsed = combined.map((item) {
          final isPending = item['status'] == 'PENDING_SYNC' || item['is_offline_pending'] == true;
          return ReportItem(
            id: item['id'].toString(),
            caseNumber: isPending ? '🕒 Sync Pending' : (item['case_number'] ?? ''),
            title: (item['description'] ?? '').toString().length > 40
                ? '${item['description'].toString().substring(0, 40)}...'
                : item['description'] ?? '',
            description: item['description'] ?? '',
            status: isPending ? 'PENDING_SYNC' : (item['status'] ?? 'SUBMITTED'),
            priority: item['priority'] ?? 'MEDIUM',
            department: item['department'] ?? 'General',
            category: item['category'] ?? 'General',
            createdAt: DateTime.tryParse(item['created_at'] ?? '') ?? DateTime.now(),
            location: LatLng(
              (item['latitude'] as num? ?? 8.54).toDouble(),
              (item['longitude'] as num? ?? 39.27).toDouble(),
            ),
            slaHoursRemaining: item['sla_hours_remaining'] as double?,
            isSlaBreached: (item['is_sla_breached'] as int? ?? 0) == 1,
            affectedCount: (item['affected_count'] as int?) ?? 1,
            isWithinGeofence: (item['is_within_geofence'] as int? ?? 1) == 1,
          );
        }).toList();
        setState(() {
          _reports = parsed;
          _isLoading = false;
        });
      }
    } catch (_) {}
  }

  Future<void> _fetchReports() async {
    // Always make sure local data is visible first
    await _loadLocalReports();

    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');

    // Token missing — user is browsing offline
    if (token == null || token.isEmpty) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
      return;
    }

    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/reports/'),
        headers: {'Authorization': 'Bearer $token'},
      ).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        final List data = decoded is List ? decoded : (decoded['results'] as List? ?? []);
        // Cache to SQLite for offline access
        try {
          await DatabaseHelper().cacheReports(List<Map<String, dynamic>>.from(data));
        } catch (_) {}
        // Refresh combined display (pending offline + new server reports)
        await _loadLocalReports();
      } else if (response.statusCode == 401) {
        // Token expired — switch to offline viewing
        if (mounted) {
          setState(() => _isLoading = false);
        }
      }
    } catch (e) {
      // Offline fallback: keep cached & pending reports loaded
      await _loadLocalReports();
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _addLocalReport(ReportItem report) {
    setState(() {
      _reports.insert(0, report);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: [
          DashboardContent(
            reports: _reports,
            isLoading: _isLoading,
            onRefresh: _fetchReports,
            onReportSubmitted: _addLocalReport,
          ),
          HomeMapContent(
            reports: _reports,
            isLoading: _isLoading,
            onRefresh: _fetchReports,
            onReportSubmitted: _addLocalReport,
          ),
          MyReportsContent(
            reports: _reports,
            isLoading: _isLoading,
            onRefresh: _fetchReports,
          ),
          const CitizenAiScreen(),
          const ProfileScreen(embedded: true),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 20, offset: const Offset(0, -5))],
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          selectedItemColor: CivicColors.govBlue,
          unselectedItemColor: CivicColors.textMuted,
          type: BottomNavigationBarType.fixed,
          elevation: 0,
          items: [
            BottomNavigationBarItem(icon: const Icon(Icons.dashboard_rounded), label: 'tab_home'.tr()),
            BottomNavigationBarItem(icon: const Icon(Icons.map), label: 'tab_map'.tr()),
            // Feature 8: show offline pending badge on history tab
            BottomNavigationBarItem(
              icon: Stack(
                clipBehavior: Clip.none,
                children: [
                  const Icon(Icons.list_alt_rounded),
                  if (_pendingOfflineCount > 0)
                    Positioned(
                      right: -6, top: -4,
                      child: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: const BoxDecoration(color: CivicColors.statusAction, shape: BoxShape.circle),
                        child: Text('$_pendingOfflineCount', style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                      ),
                    ),
                ],
              ),
              label: 'tab_history'.tr(),
            ),
            // AI Assistant tab
            BottomNavigationBarItem(
              icon: Container(
                width: 28, height: 28,
                decoration: BoxDecoration(
                  gradient: _currentIndex == 3
                      ? const LinearGradient(colors: [CivicColors.govBlue, CivicColors.navyDeep])
                      : null,
                  color: _currentIndex == 3 ? null : Colors.transparent,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.smart_toy_rounded,
                  size: 20,
                  color: _currentIndex == 3 ? Colors.white : CivicColors.textMuted,
                ),
              ),
              label: 'AI Help',
            ),
            BottomNavigationBarItem(icon: const Icon(Icons.person_rounded), label: 'tab_profile'.tr()),
          ],
        ),
      ),
    );
  }
}

class DashboardContent extends StatelessWidget {
  final List<ReportItem> reports;
  final bool isLoading;
  final VoidCallback onRefresh;
  final Function(ReportItem) onReportSubmitted;

  const DashboardContent({
    super.key,
    required this.reports,
    required this.isLoading,
    required this.onRefresh,
    required this.onReportSubmitted,
  });

  @override
  Widget build(BuildContext context) {
    int resolved = reports.where((r) => r.status == 'RESOLVED' || r.status == 'CLOSED').length;
    int pending = reports.where((r) => r.status != 'RESOLVED' && r.status != 'CLOSED').length;

    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      child: CustomScrollView(
        slivers: [
            SliverAppBar(
              expandedHeight: 220,
              floating: false,
              pinned: true,
              backgroundColor: CivicColors.navyDeep,
              automaticallyImplyLeading: false,
              flexibleSpace: FlexibleSpaceBar(
                title: const Text('Adama Smart Citizen',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.white, letterSpacing: -0.2)),
                background: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [CivicColors.navyDeep, CivicColors.govBlue],
                    ),
                  ),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Opacity(
                        opacity: 0.2,
                        child: Image.asset(
                          'assets/images/adama_bg.jpg',
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                        ),
                      ),
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [Colors.transparent, CivicColors.navyDeep.withValues(alpha: 0.85)],
                          ),
                        ),
                      ),
                      const Positioned(
                        bottom: 60,
                        left: 20,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Welcome to Adama', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.3)),
                            SizedBox(height: 4),
                            Text('Report issues and improve your city', style: TextStyle(color: Colors.white70, fontSize: 13)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Main Action Button
                    DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [CivicColors.govBlue, CivicColors.navyDeep],
                          begin: Alignment.topLeft, end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [BoxShadow(color: CivicColors.govBlue.withValues(alpha: 0.35), blurRadius: 14, offset: const Offset(0, 5))],
                      ),
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.add_location_alt_rounded, size: 24),
                        label: const Text('REPORT AN ISSUE', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: 0.8)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 18),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        onPressed: () async {
                          final result = await Navigator.push<ReportItem>(
                            context,
                            MaterialPageRoute(builder: (context) => const SubmitReportScreen()),
                          );
                          if (result != null) onReportSubmitted(result);
                        },
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Feature 4: Administrative Appeals (Iyyannoo) Management Button
                    OutlinedButton.icon(
                      icon: const Icon(Icons.gavel_rounded, color: CivicColors.govBlue, size: 20),
                      label: const Text(
                        'ADMINISTRATIVE APPEALS (IYYANNOO)',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: CivicColors.govBlue, letterSpacing: 0.5),
                      ),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        side: const BorderSide(color: CivicColors.govBlue, width: 1.5),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        backgroundColor: CivicColors.govBlue.withValues(alpha: 0.05),
                      ),
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const AppealsManagementScreen()),
                        );
                      },
                    ),
                    const SizedBox(height: 24),

                    // Quick Stats
                    Text('Your Activity', style: CivicText.h3),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(child: _StatCard(title: 'Total', count: reports.length.toString(), color: CivicColors.govBlue)),
                        const SizedBox(width: 10),
                        Expanded(child: _StatCard(title: 'Pending', count: pending.toString(), color: CivicColors.statusAction)),
                        const SizedBox(width: 10),
                        Expanded(child: _StatCard(title: 'Resolved', count: resolved.toString(), color: CivicColors.emeraldGreen)),
                      ],
                    ),
                    const SizedBox(height: 28),

                    // Recent Reports
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Recent Reports', style: CivicText.h3),
                        TextButton.icon(
                          onPressed: onRefresh,
                          icon: const Icon(Icons.refresh_rounded, size: 16),
                          label: const Text('Refresh'),
                          style: TextButton.styleFrom(foregroundColor: CivicColors.govBlue),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    
                    if (isLoading)
                      const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()))
                    else if (reports.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: CivicColors.canvasLight,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: CivicColors.surfaceBorderLight),
                        ),
                        child: const Column(
                          children: [
                            Icon(Icons.inbox_rounded, size: 44, color: CivicColors.textMuted),
                            SizedBox(height: 12),
                            Text('No reports yet', style: TextStyle(fontSize: 15, color: CivicColors.textSecondary, fontWeight: FontWeight.w500)),
                          ],
                        ),
                      )
                    else
                      ...reports.take(3).map((r) => _ReportCard(report: r)).toList(),
                  ],
                ),
              ),
            ),
          ],
        ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String count;
  final Color color;

  const _StatCard({required this.title, required this.count, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
      decoration: BoxDecoration(
        color: CivicColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25)),
        boxShadow: [BoxShadow(color: color.withValues(alpha: 0.08), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Column(
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.12), shape: BoxShape.circle),
            child: Icon(Icons.bar_chart_rounded, size: 18, color: color),
          ),
          const SizedBox(height: 8),
          Text(count, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: color, letterSpacing: -0.5)),
          const SizedBox(height: 2),
          Text(title, style: CivicText.micro.copyWith(color: CivicColors.textSecondary)),
        ],
      ),
    );
  }
}

/// Home tab with interactive Map
class HomeMapContent extends StatelessWidget {
  final List<ReportItem> reports;
  final bool isLoading;
  final VoidCallback onRefresh;
  final Function(ReportItem) onReportSubmitted;

  const HomeMapContent({
    super.key,
    required this.reports,
    required this.isLoading,
    required this.onRefresh,
    required this.onReportSubmitted,
  });

  Color _getMarkerColor(String priority, String status) {
    if (status == 'RESOLVED' || status == 'CLOSED') return CivicColors.statusSolved;
    if (priority == 'CRITICAL' || priority == 'HIGH') return CivicColors.statusRejected;
    return CivicColors.statusAction;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        AppBar(
          title: const Text('Adama Reports Map'),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: onRefresh,
            ),
          ],
        ),
        Expanded(
          child: Stack(
            children: [
              FlutterMap(
                options: const MapOptions(
                  initialCenter: LatLng(8.5400, 39.2700),
                  initialZoom: 13.0,
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'com.adama.smartcitizen',
                  ),
                  MarkerLayer(
                    markers: reports.map((r) => Marker(
                      point: r.location,
                      width: 40,
                      height: 40,
                      child: GestureDetector(
                        onTap: () {
                          showModalBottomSheet(
                            context: context,
                            backgroundColor: Colors.transparent,
                            builder: (ctx) => _MapReportPreview(report: r),
                          );
                        },
                        child: Container(
                          decoration: BoxDecoration(
                            color: _getMarkerColor(r.priority, r.status).withValues(alpha: 0.2),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.location_on, color: _getMarkerColor(r.priority, r.status), size: 32),
                        ),
                      ),
                    )).toList(),
                  ),
                ],
              ),

              // Loading indicator
              if (isLoading)
                const Center(child: CircularProgressIndicator()),

              // No reports message
              if (!isLoading && reports.isEmpty)
                Center(
                  child: Container(
                    padding: const EdgeInsets.all(20),
                    margin: const EdgeInsets.all(40),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.9),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Text(
                      'No reports yet.\nTap the button below to submit your first report!',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 14, color: Colors.black54),
                    ),
                  ),
                ),

              // Report button
              Positioned(
                bottom: 32,
                right: 24,
                left: 24,
                child: SafeArea(
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.add_location_alt, size: 24),
                    label: const Text('REPORT AN ISSUE', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, letterSpacing: 0.6)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: CivicColors.govBlue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 6,
                      shadowColor: CivicColors.govBlue.withValues(alpha: 0.4),
                    ),
                    onPressed: () async {
                      final result = await Navigator.push<ReportItem>(
                        context,
                        MaterialPageRoute(builder: (context) => const SubmitReportScreen()),
                      );
                      if (result != null) {
                        onReportSubmitted(result);
                      }
                    },
                  ),
                ),
              ),

              // Legend
              Positioned(
                top: 16,
                left: 16,
                right: 16,
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.9),
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 10)],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _LegendItem(color: CivicColors.statusRejected, label: 'Urgent'),
                      _LegendItem(color: CivicColors.statusAction, label: 'In Progress'),
                      _LegendItem(color: CivicColors.statusSolved, label: 'Resolved'),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String label;

  const _LegendItem({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(Icons.location_on, color: color, size: 16),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
      ],
    );
  }
}

class _MapReportPreview extends StatefulWidget {
  final ReportItem report;

  const _MapReportPreview({required this.report});

  @override
  State<_MapReportPreview> createState() => _MapReportPreviewState();
}

class _MapReportPreviewState extends State<_MapReportPreview> {
  bool _upvoting = false;
  int _count = 1;

  @override
  void initState() {
    super.initState();
    _count = widget.report.affectedCount;
  }

  Future<void> _upvote() async {
    if (_upvoting) return;
    setState(() => _upvoting = true);
    try {
      final res = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/reports/${widget.report.id}/upvote_affected/'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200 && mounted) {
        final data = jsonDecode(res.body);
        setState(() {
          _count = data['affected_count'] ?? _count + 1;
          _upvoting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Recorded — $_count citizens affected'),
          backgroundColor: CivicColors.emeraldGreen,
          duration: const Duration(seconds: 2),
        ));
      }
    } catch (_) {
      if (mounted) setState(() => _upvoting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 20)],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(widget.report.caseNumber, style: TextStyle(color: Colors.indigo[400], fontWeight: FontWeight.bold)),
              Text(widget.report.status.replaceAll('_', ' '), style: TextStyle(color: Colors.grey[600], fontSize: 12, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 4),
          // Feature 1: SLA badge on map popup
          if (!['RESOLVED', 'CLOSED', 'REJECTED'].contains(widget.report.status) && widget.report.slaHoursRemaining != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: CivicSlaBadge(hoursRemaining: widget.report.slaHoursRemaining!, isBreached: widget.report.isSlaBreached),
            ),
          Text(widget.report.department, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text(widget.report.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.grey[700], fontSize: 13)),
          const SizedBox(height: 14),
          Row(
            children: [
              // Feature 2: Me Too upvote button on map
              Expanded(
                child: OutlinedButton.icon(
                  icon: _upvoting
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.thumb_up_alt_outlined, size: 16),
                  label: Text('+1 Affected ($_count)', style: const TextStyle(fontSize: 12)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.indigo[700],
                    side: BorderSide(color: Colors.indigo[200]!),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                  onPressed: _upvote,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(
                        builder: (context) => ReportDetailsScreen(reportId: widget.report.id, caseNumber: widget.report.caseNumber)));
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: CivicColors.govBlue,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                  child: const Text('Details', style: TextStyle(fontSize: 12)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final ReportItem report;

  const _ReportCard({required this.report});

  Color _statusColor() => CivicStatus.accent(report.status);
  Color _priorityColor() => CivicPriority.color(report.priority);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: BorderSide(color: Colors.grey[200]!)),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () {
          Navigator.push(context, MaterialPageRoute(builder: (context) => ReportDetailsScreen(reportId: report.id, caseNumber: report.caseNumber)));
        },
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(width: 4, height: 50, decoration: BoxDecoration(color: _statusColor(), borderRadius: BorderRadius.circular(2))),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text(report.department, style: CivicText.h3.copyWith(fontSize: 14))),
                        // Feature 1: SLA countdown badge
                        if (!['RESOLVED', 'CLOSED', 'REJECTED'].contains(report.status) && report.slaHoursRemaining != null)
                          Padding(
                            padding: const EdgeInsets.only(right: 6),
                            child: CivicSlaBadge(hoursRemaining: report.slaHoursRemaining!, isBreached: report.isSlaBreached),
                          ),
                        CivicPriorityBadge(report.priority),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(report.caseNumber, style: TextStyle(fontSize: 12, color: Colors.indigo[400], fontWeight: FontWeight.w500)),
                    const SizedBox(height: 4),
                    Text(report.description, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        CivicStatusBadge(report.status),
                        // Feature 2: Affected count badge
                        if (report.affectedCount > 1) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                            decoration: BoxDecoration(color: CivicColors.infoBg, borderRadius: BorderRadius.circular(20)),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.people_rounded, size: 10, color: CivicColors.infoText),
                                const SizedBox(width: 3),
                                Text('${report.affectedCount}', style: CivicText.micro.copyWith(color: CivicColors.infoText, fontSize: 10)),
                              ],
                            ),
                          ),
                        ],
                        // Feature 6: Outside geofence warning
                        if (!report.isWithinGeofence) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                            decoration: BoxDecoration(color: CivicColors.warningBg, borderRadius: BorderRadius.circular(20)),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.location_off_rounded, size: 10, color: CivicColors.warningText),
                                const SizedBox(width: 3),
                                Text('Outside limits', style: CivicText.micro.copyWith(color: CivicColors.warningText, fontSize: 9)),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(Icons.chevron_right, color: Colors.grey[400], size: 20),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Feature 1: SLA Countdown Badge ───────────────────────────────────────────
/// My Reports tab
class MyReportsContent extends StatefulWidget {
  final List<ReportItem> reports;
  final bool isLoading;
  final VoidCallback onRefresh;

  const MyReportsContent({super.key, required this.reports, required this.isLoading, required this.onRefresh});

  @override
  State<MyReportsContent> createState() => _MyReportsContentState();
}

class _MyReportsContentState extends State<MyReportsContent> {
  String _searchQuery = '';
  String _statusFilter = 'ALL';

  @override
  Widget build(BuildContext context) {
    final filteredReports = widget.reports.where((r) {
      if (_statusFilter != 'ALL' && r.status != _statusFilter) return false;
      if (_searchQuery.isNotEmpty &&
          !r.description.toLowerCase().contains(_searchQuery.toLowerCase()) &&
          !r.caseNumber.toLowerCase().contains(_searchQuery.toLowerCase()) &&
          !r.department.toLowerCase().contains(_searchQuery.toLowerCase())) return false;
      return true;
    }).toList();

    return Column(
      children: [
        AppBar(
          title: const Text('Report History'),
          actions: [
            IconButton(icon: const Icon(Icons.refresh), onPressed: widget.onRefresh),
          ],
        ),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10)]),
          child: Column(
            children: [
              TextField(
                decoration: InputDecoration(
                  hintText: 'Search case number or description...',
                  prefixIcon: const Icon(Icons.search),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(vertical: 0),
                ),
                onChanged: (v) => setState(() => _searchQuery = v),
              ),
              const SizedBox(height: 12),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: ['ALL', 'SUBMITTED', 'ASSIGNED', 'UNDER_INVESTIGATION', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'].map((s) {
                    final isSelected = _statusFilter == s;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(s.replaceAll('_', ' ')),
                        selected: isSelected,
                        onSelected: (selected) => setState(() => _statusFilter = s),
                      ),
                    );
                  }).toList(),
                ),
              )
            ],
          ),
        ),

        Expanded(
          child: widget.isLoading
              ? const Center(child: CircularProgressIndicator())
              : filteredReports.isEmpty
                  ? Center(child: Text('No reports found', style: TextStyle(color: Colors.grey[500])))
                  : RefreshIndicator(
                      onRefresh: () async => widget.onRefresh(),
                      child: ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: filteredReports.length,
                        itemBuilder: (context, index) => _ReportCard(report: filteredReports[index]),
                      ),
                    ),
        ),
      ],
    );
  }
}
