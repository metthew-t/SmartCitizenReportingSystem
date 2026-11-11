import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_config.dart';
import '../theme.dart';

class AppealsManagementScreen extends StatefulWidget {
  const AppealsManagementScreen({super.key});

  @override
  State<AppealsManagementScreen> createState() => _AppealsManagementScreenState();
}

class _AppealsManagementScreenState extends State<AppealsManagementScreen> {
  List<dynamic> _appeals = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchAppeals();
  }

  Future<void> _fetchAppeals() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      final headers = <String, String>{
        'Content-Type': 'application/json',
      };
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }

      final res = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/appeals/'),
        headers: headers,
      ).timeout(const Duration(seconds: 10));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        setState(() {
          _appeals = ArrayOrResults(data);
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load appeals (${res.statusCode})';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Network error loading appeals. Please check your connection.';
        _isLoading = false;
      });
    }
  }

  List<dynamic> ArrayOrResults(dynamic data) {
    if (data is List) return data;
    if (data is Map && data['results'] is List) return data['results'];
    return [];
  }

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'UPHELD':
        return Colors.green[700]!;
      case 'UNDER_REVIEW':
        return Colors.orange[700]!;
      case 'DISMISSED':
        return Colors.red[700]!;
      case 'SUBMITTED':
      default:
        return CivicColors.govBlue;
    }
  }

  String _statusLabel(String status) {
    switch (status.toUpperCase()) {
      case 'UPHELD':
        return 'Upheld / Case Reopened';
      case 'UNDER_REVIEW':
        return 'Under Investigation';
      case 'DISMISSED':
        return 'Dismissed';
      case 'SUBMITTED':
      default:
        return 'Submitted for Review';
    }
  }

  @override
  Widget build(BuildContext context) {
    final underReviewCount = _appeals.where((a) => a['status'] == 'UNDER_REVIEW' || a['status'] == 'SUBMITTED').length;
    final resolvedCount = _appeals.where((a) => a['status'] == 'UPHELD' || a['status'] == 'DISMISSED').length;

    return Scaffold(
      backgroundColor: CivicColors.canvasLight,
      appBar: AppBar(
        title: const Text(
          'Administrative Appeals',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
        ),
        backgroundColor: CivicColors.navyDeep,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchAppeals,
            tooltip: 'Refresh Appeals',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchAppeals,
        child: CustomScrollView(
          slivers: [
            // Top Overview Banner
            SliverToBoxAdapter(
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [CivicColors.navyDeep, CivicColors.govBlue],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.gavel_rounded, color: Colors.white, size: 28),
                        ),
                        const SizedBox(width: 14),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Citizen Appeal Rights (Iyyannoo)',
                                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Legal review by City Administration & Mayor’s Office',
                                style: TextStyle(color: Colors.white70, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Row(
                      children: [
                        Expanded(
                          child: _SummaryBox(
                            label: 'Total Appeals',
                            value: '${_appeals.length}',
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _SummaryBox(
                            label: 'In Review',
                            value: '$underReviewCount',
                            color: Colors.amberAccent,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _SummaryBox(
                            label: 'Decided',
                            value: '$resolvedCount',
                            color: Colors.greenAccent,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Content
            if (_isLoading)
              const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              SliverFillRemaining(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline_rounded, size: 48, color: Colors.red),
                        const SizedBox(height: 12),
                        Text(_error!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, color: Colors.red)),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _fetchAppeals,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Try Again'),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            else if (_appeals.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.shield_outlined, size: 64, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        const Text(
                          'No Appeals on Record',
                          style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: CivicColors.textPrimary),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'If any of your reports are unresolved, delayed, or unfairly rejected, you can file an appeal from the Report Details screen.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 13, color: Colors.grey[600], height: 1.4),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final item = _appeals[index];
                      final status = item['status']?.toString() ?? 'SUBMITTED';
                      final color = _statusColor(status);
                      final label = _statusLabel(status);
                      final appealNumber = item['appeal_number'] ?? 'APL-???';
                      final caseNumber = item['case_number'] ?? '';
                      final deptName = item['department_name'] ?? 'General';
                      final reason = item['reason'] ?? '';
                      final outcome = item['desired_outcome'] ?? '';
                      final reviewerDecision = item['reviewer_decision'] ?? '';
                      final reviewerName = item['reviewer_name'] ?? '';
                      final reviewedAt = item['reviewed_at'];
                      final createdAt = item['created_at'];

                      return Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.grey[200]!),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.04),
                              blurRadius: 10,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Header
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.06),
                                borderRadius: const BorderRadius.only(
                                  topLeft: Radius.circular(16),
                                  topRight: Radius.circular(16),
                                ),
                                border: Border(bottom: BorderSide(color: color.withValues(alpha: 0.15))),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      Icon(Icons.assignment_outlined, size: 18, color: color),
                                      const SizedBox(width: 8),
                                      Text(
                                        appealNumber,
                                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: color),
                                      ),
                                    ],
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: color,
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      label,
                                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // Body
                            Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (caseNumber.isNotEmpty) ...[
                                    Row(
                                      children: [
                                        Text('Associated Case: ', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                                        Text(caseNumber, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: CivicColors.govBlue)),
                                        const SizedBox(width: 8),
                                        Text('• $deptName', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                                      ],
                                    ),
                                    const SizedBox(height: 10),
                                  ],

                                  // Grounds for Appeal
                                  const Text(
                                    'Grounds for Appeal:',
                                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: CivicColors.textPrimary),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    reason,
                                    style: TextStyle(fontSize: 13, color: Colors.grey[800], height: 1.4),
                                  ),

                                  if (outcome.isNotEmpty) ...[
                                    const SizedBox(height: 10),
                                    const Text(
                                      'Requested Remedy:',
                                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: CivicColors.textPrimary),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      outcome,
                                      style: TextStyle(fontSize: 12, color: Colors.grey[700], fontStyle: FontStyle.italic),
                                    ),
                                  ],

                                  // Government Determination (if reviewed)
                                  if (reviewerDecision.isNotEmpty) ...[
                                    const SizedBox(height: 14),
                                    Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: Colors.green[50],
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: Colors.green[200]!),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Icon(Icons.verified_user_rounded, size: 16, color: Colors.green[800]),
                                              const SizedBox(width: 6),
                                              Text(
                                                'Official Administrative Determination:',
                                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.green[900]),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 6),
                                          Text(
                                            reviewerDecision,
                                            style: TextStyle(fontSize: 13, color: Colors.green[900], height: 1.3),
                                          ),
                                          if (reviewerName.isNotEmpty) ...[
                                            const SizedBox(height: 6),
                                            Text(
                                              'Reviewing Authority: $reviewerName',
                                              style: TextStyle(fontSize: 11, color: Colors.green[800], fontWeight: FontWeight.w600),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                  ],

                                  const SizedBox(height: 10),
                                  // Date
                                  if (createdAt != null)
                                    Text(
                                      'Filed: ${DateTime.tryParse(createdAt)?.toLocal().toString().substring(0, 16) ?? createdAt}',
                                      style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                    childCount: _appeals.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _SummaryBox extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _SummaryBox({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        children: [
          Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: color)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 11, color: Colors.white70)),
        ],
      ),
    );
  }
}

