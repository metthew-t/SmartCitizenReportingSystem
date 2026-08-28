import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'submit_report_screen.dart';
import 'report_details_screen.dart';
import 'profile_screen.dart';

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

  @override
  void initState() {
    super.initState();
    _fetchReports();
  }

  Future<void> _fetchReports() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    if (token == null) return;

    try {
      final response = await http.get(
        Uri.parse('https://smartcitizenreportingsystem.onrender.com/api/v1/reports/'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (response.statusCode == 200) {
        final List data = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            _reports = data.map((item) => ReportItem(
              id: item['id'].toString(),
              caseNumber: item['case_number'] ?? '',
              title: (item['description'] ?? '').toString().length > 40
                  ? '${item['description'].toString().substring(0, 40)}...'
                  : item['description'] ?? '',
              description: item['description'] ?? '',
              status: item['status'] ?? 'SUBMITTED',
              priority: item['priority'] ?? 'MEDIUM',
              department: item['department_name'] ?? 'Unknown',
              category: item['category_name'] ?? 'General',
              createdAt: DateTime.tryParse(item['created_at'] ?? '') ?? DateTime.now(),
              location: LatLng(
                (item['latitude'] ?? 8.54).toDouble(),
                (item['longitude'] ?? 39.27).toDouble(),
              ),
            )).toList();
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

  void _addLocalReport(ReportItem report) {
    setState(() {
      _reports.insert(0, report);
    });
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
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
      const ProfileScreen(),
    ];

    return Scaffold(
      body: pages[_currentIndex],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 20, offset: const Offset(0, -5))],
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          selectedItemColor: Colors.green[700],
          unselectedItemColor: Colors.grey[400],
          type: BottomNavigationBarType.fixed,
          elevation: 0,
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.map), label: 'Map'),
            BottomNavigationBarItem(icon: Icon(Icons.list_alt_rounded), label: 'History'),
            BottomNavigationBarItem(icon: Icon(Icons.person_rounded), label: 'Profile'),
          ],
        ),
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
    if (status == 'RESOLVED' || status == 'CLOSED') return Colors.green;
    if (priority == 'CRITICAL' || priority == 'HIGH') return Colors.red;
    return Colors.amber;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Adama Reports Map'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: onRefresh,
          ),
        ],
      ),
      body: Stack(
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
                label: const Text('REPORT INCIDENT', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green[700],
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 10,
                  shadowColor: Colors.green.withValues(alpha: 0.5),
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
                  _LegendItem(color: Colors.red, label: 'Urgent'),
                  _LegendItem(color: Colors.amber, label: 'In Progress'),
                  _LegendItem(color: Colors.green, label: 'Resolved'),
                ],
              ),
            ),
          ),
        ],
      ),
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

class _MapReportPreview extends StatelessWidget {
  final ReportItem report;

  const _MapReportPreview({required this.report});

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
              Text(report.caseNumber, style: TextStyle(color: Colors.indigo[400], fontWeight: FontWeight.bold)),
              Text(report.status.replaceAll('_', ' '), style: TextStyle(color: Colors.grey[600], fontSize: 12, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 8),
          Text(report.department, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(report.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.grey[700])),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (context) => ReportDetailsScreen(reportId: report.id, caseNumber: report.caseNumber)));
              },
              child: const Text('View Full Details'),
            ),
          )
        ],
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final ReportItem report;

  const _ReportCard({required this.report});

  Color _statusColor() {
    switch (report.status) {
      case 'SUBMITTED': return Colors.indigo;
      case 'RECEIVED': return Colors.purple;
      case 'ASSIGNED': return Colors.blue;
      case 'UNDER_INVESTIGATION': return Colors.amber;
      case 'IN_PROGRESS': return Colors.orange;
      case 'RESOLVED': return Colors.green;
      case 'CLOSED': return Colors.grey;
      default: return Colors.grey;
    }
  }

  Color _priorityColor() {
    switch (report.priority) {
      case 'CRITICAL': return Colors.red;
      case 'HIGH': return Colors.orange;
      case 'MEDIUM': return Colors.blue;
      case 'LOW': return Colors.grey;
      default: return Colors.grey;
    }
  }

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
                        Expanded(child: Text(report.department, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14))),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(color: _priorityColor().withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                          child: Text(report.priority, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: _priorityColor())),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(report.caseNumber, style: TextStyle(fontSize: 12, color: Colors.indigo[400], fontWeight: FontWeight.w500)),
                    const SizedBox(height: 4),
                    Text(report.description, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: _statusColor().withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(width: 6, height: 6, decoration: BoxDecoration(color: _statusColor(), shape: BoxShape.circle)),
                          const SizedBox(width: 4),
                          Text(report.status.replaceAll('_', ' '), style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: _statusColor())),
                        ],
                      ),
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

    return Scaffold(
      appBar: AppBar(
        title: const Text('Report History'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: widget.onRefresh),
        ],
      ),
      body: Column(
        children: [
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
                    children: ['ALL', 'SUBMITTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) {
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
      ),
    );
  }
}
