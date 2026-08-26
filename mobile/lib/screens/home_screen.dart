import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'submit_report_screen.dart';
import 'report_details_screen.dart';
import 'profile_screen.dart';

/// Demo report data model
class DemoReportItem {
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
  final LatLng location; // Added location

  const DemoReportItem({
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

/// Static demo reports for testing
final List<DemoReportItem> demoReports = [
  DemoReportItem(
    id: '1',
    caseNumber: 'AD-00001',
    title: 'Water Pipe Burst',
    description: 'Broken water pipe flooding the street near the main market area. Water is wasting and making the road slippery.',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    department: 'Waajjira Bishaan Dhugaatii fi Dhangala\'aa',
    category: 'Water & Sanitation',
    createdAt: DateTime.now().subtract(const Duration(days: 2)),
    location: const LatLng(8.5410, 39.2710),
  ),
  DemoReportItem(
    id: '2',
    caseNumber: 'AD-00002',
    title: 'Street Light Out',
    description: 'Street light not working for over a week near Kebele 04. Area is very dark and unsafe at night.',
    status: 'SUBMITTED',
    priority: 'MEDIUM',
    department: 'Abbaa Taayitaa Konistiraakshinii',
    category: 'Infrastructure Issue',
    createdAt: DateTime.now().subtract(const Duration(days: 1)),
    location: const LatLng(8.5450, 39.2650),
  ),
  DemoReportItem(
    id: '3',
    caseNumber: 'AD-00003',
    title: 'Illegal Waste Dumping',
    description: 'Illegal waste dumping behind residential buildings near the school. Health hazard for the community.',
    status: 'RESOLVED',
    priority: 'HIGH',
    department: 'Abbaa Taayitaa Eegumsa Naannoo',
    category: 'Environment & Cleanliness',
    createdAt: DateTime.now().subtract(const Duration(days: 5)),
    location: const LatLng(8.5350, 39.2750),
  ),
  DemoReportItem(
    id: '4',
    caseNumber: 'AD-00004',
    title: 'Road Pothole',
    description: 'Large pothole on the main road causing traffic issues. Multiple vehicles have been damaged.',
    status: 'ASSIGNED',
    priority: 'CRITICAL',
    department: 'Abbaa Taayitaa Konistiraakshinii',
    category: 'Infrastructure Issue',
    createdAt: DateTime.now().subtract(const Duration(hours: 6)),
    location: const LatLng(8.5380, 39.2680),
  ),
  DemoReportItem(
    id: '5',
    caseNumber: 'AD-00005',
    title: 'Noisy Construction',
    description: 'Construction site noise at night disturbing residents in Kebele 08.',
    status: 'RECEIVED',
    priority: 'LOW',
    department: 'Bulchiinsaa fi Nageenya',
    category: 'Public Safety',
    createdAt: DateTime.now().subtract(const Duration(hours: 12)),
    location: const LatLng(8.5420, 39.2780),
  ),
];

class HomeScreen extends StatefulWidget {
  final bool isDemoMode;

  const HomeScreen({super.key, this.isDemoMode = false});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final List<DemoReportItem> _localReports = [];

  void _addReport(DemoReportItem report) {
    setState(() {
      _localReports.insert(0, report);
    });
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      HomeMapContent(
        isDemoMode: widget.isDemoMode,
        onReportSubmitted: _addReport,
        reports: [..._localReports, ...demoReports],
      ),
      MyReportsContent(
        isDemoMode: widget.isDemoMode,
        localReports: _localReports,
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

/// Home tab with interactive Map and quick stats
class HomeMapContent extends StatelessWidget {
  final bool isDemoMode;
  final Function(DemoReportItem) onReportSubmitted;
  final List<DemoReportItem> reports;

  const HomeMapContent({
    super.key,
    required this.isDemoMode,
    required this.onReportSubmitted,
    required this.reports,
  });

  Color _getMarkerColor(String priority, String status) {
    // Green = Resolved
    if (status == 'RESOLVED' || status == 'CLOSED') return Colors.green;
    
    // Red = Urgent (Critical/High Priority AND not resolved)
    if (priority == 'CRITICAL' || priority == 'HIGH') return Colors.red;
    
    // Yellow = In Progress / Normal
    return Colors.amber;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Adama Reports Map'),
        actions: [
          if (isDemoMode)
            Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(color: Colors.orange.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(8)),
              child: const Text('DEMO', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.orange)),
            ),
        ],
      ),
      body: Stack(
        children: [
          // Flutter Map taking the background
          FlutterMap(
            options: const MapOptions(
              initialCenter: LatLng(8.5400, 39.2700), // Adama Center
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

          // Floating Action Button for new report
          Positioned(
            bottom: 32, // slightly higher
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
                  final result = await Navigator.push<DemoReportItem>(
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

          // Top status legend
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
  final DemoReportItem report;

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
          Text(report.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(report.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.grey[700])),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (context) => ReportDetailsScreen(report: report)));
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
  final DemoReportItem report;

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
          Navigator.push(context, MaterialPageRoute(builder: (context) => ReportDetailsScreen(report: report)));
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
                        Text(report.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(color: _priorityColor().withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                          child: Text(report.priority, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: _priorityColor())),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(report.caseNumber, style: TextStyle(fontSize: 12, color: Colors.indigo[400], fontWeight: FontWeight.w500)),
                    const SizedBox(height: 6),
                    Row(
                      children: [
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

/// My Reports tab with Filtering
class MyReportsContent extends StatefulWidget {
  final bool isDemoMode;
  final List<DemoReportItem> localReports;

  const MyReportsContent({super.key, required this.isDemoMode, required this.localReports});

  @override
  State<MyReportsContent> createState() => _MyReportsContentState();
}

class _MyReportsContentState extends State<MyReportsContent> {
  String _searchQuery = '';
  String _statusFilter = 'ALL';

  @override
  Widget build(BuildContext context) {
    final allReports = [...widget.localReports, ...demoReports];
    
    final filteredReports = allReports.where((r) {
      if (_statusFilter != 'ALL' && r.status != _statusFilter) return false;
      if (_searchQuery.isNotEmpty && !r.title.toLowerCase().contains(_searchQuery.toLowerCase()) && !r.caseNumber.toLowerCase().contains(_searchQuery.toLowerCase())) return false;
      return true;
    }).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Report History')),
      body: Column(
        children: [
          // Search & Filter
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10)]),
            child: Column(
              children: [
                TextField(
                  decoration: InputDecoration(
                    hintText: 'Search case number or title...',
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
                    children: ['ALL', 'SUBMITTED', 'IN_PROGRESS', 'RESOLVED'].map((status) {
                      final isSelected = _statusFilter == status;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(status),
                          selected: isSelected,
                          onSelected: (selected) => setState(() => _statusFilter = status),
                        ),
                      );
                    }).toList(),
                  ),
                )
              ],
            ),
          ),

          // List
          Expanded(
            child: filteredReports.isEmpty
              ? Center(child: Text('No reports found', style: TextStyle(color: Colors.grey[500])))
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: filteredReports.length,
                  itemBuilder: (context, index) => _ReportCard(report: filteredReports[index]),
                ),
          ),
        ],
      ),
    );
  }
}
