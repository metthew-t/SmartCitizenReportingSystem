import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

const String _baseUrl = 'https://smartcitizenreportingsystem.onrender.com/api/v1';

class ReportDetailsScreen extends StatefulWidget {
  final String reportId;
  final String caseNumber;

  const ReportDetailsScreen({super.key, required this.reportId, required this.caseNumber});

  @override
  State<ReportDetailsScreen> createState() => _ReportDetailsScreenState();
}

class _ReportDetailsScreenState extends State<ReportDetailsScreen> {
  // 0: Details, 1: Citizen Chat, 2: Department Channel
  int _currentTab = 0;

  // Report data
  String _description = '';
  String _status = 'SUBMITTED';
  String _priority = 'MEDIUM';
  String _department = '';
  String _primaryDeptId = '';
  String _category = '';
  String _citizenName = '';
  DateTime _createdAt = DateTime.now();
  bool _isLoadingReport = true;

  // Shared-with departments (names for display)
  List<String> _sharedWithNames = [];

  // Current user role flags
  bool _isOfficer = false;
  bool _isDeptManager = false;
  bool _isCityAdmin = false;

  // Citizen chat state
  final _chatController = TextEditingController();
  List<Map<String, dynamic>> _messages = [];

  // Dept channel state
  final _deptChatController = TextEditingController();
  List<Map<String, dynamic>> _deptMessages = [];
  bool _isLoadingDeptMessages = false;

  // All available departments for the share dialog
  List<Map<String, dynamic>> _allDepartments = [];

  // Feedback state
  int _rating = 0;
  bool? _isSatisfied;
  final _feedbackController = TextEditingController();
  bool _feedbackSubmitted = false;

  @override
  void initState() {
    super.initState();
    _loadUserRole();
    _fetchReportDetails();
    _fetchMessages();
  }

  @override
  void dispose() {
    _chatController.dispose();
    _deptChatController.dispose();
    _feedbackController.dispose();
    super.dispose();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  Future<Map<String, String>> _authHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<int?> _currentUserId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt('user_id');
  }

  /// Returns true if user can share / view the department channel
  bool get _canShareOrViewDeptChannel => _isOfficer || _isDeptManager || _isCityAdmin;

  // ── Data fetching ─────────────────────────────────────────────────────────

  Future<void> _loadUserRole() async {
    try {
      final headers = await _authHeaders();
      final res = await http.get(Uri.parse('$_baseUrl/auth/me/'), headers: headers);
      if (res.statusCode == 200 && mounted) {
        final data = jsonDecode(res.body);
        setState(() {
          _isOfficer = data['is_officer'] == true;
          _isDeptManager = data['is_department_manager'] == true;
          _isCityAdmin = data['is_city_admin'] == true;
        });
      }
    } catch (_) {}
  }

  Future<void> _fetchReportDetails() async {
    try {
      final headers = await _authHeaders();
      final res = await http.get(
        Uri.parse('$_baseUrl/reports/${widget.reportId}/'),
        headers: headers,
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (mounted) {
          // Parse shared_with list — serializer returns list of dept IDs, but
          // department_name for primary is returned separately. We fetch dept
          // names from the all-departments endpoint and cross-reference.
          final rawShared = data['shared_with'] as List<dynamic>? ?? [];
          setState(() {
            _description = data['description'] ?? '';
            _status = data['status'] ?? 'SUBMITTED';
            _priority = data['priority'] ?? 'MEDIUM';
            _department = data['department_name'] ?? 'Unknown';
            _primaryDeptId = (data['primary_department'] ?? '').toString();
            _category = data['category_name'] ?? 'General';
            _citizenName = data['citizen_name'] ?? 'Citizen';
            _createdAt = DateTime.tryParse(data['created_at'] ?? '') ?? DateTime.now();
            _isLoadingReport = false;
            // shared_with comes as list of dept IDs; resolve names later
            _sharedWithNames = rawShared.map((e) => e.toString()).toList();
          });
          // Resolve IDs → names
          _resolveSharedDeptNames(rawShared.map((e) => e.toString()).toList());
        }
      } else {
        if (mounted) setState(() => _isLoadingReport = false);
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingReport = false);
    }
  }

  Future<void> _resolveSharedDeptNames(List<String> ids) async {
    if (ids.isEmpty) return;
    try {
      final headers = await _authHeaders();
      final res = await http.get(Uri.parse('$_baseUrl/departments/'), headers: headers);
      if (res.statusCode == 200) {
        final decoded = jsonDecode(res.body);
        final List depts = decoded is List ? decoded : (decoded['results'] ?? []);
        _allDepartments = depts
            .map<Map<String, dynamic>>((d) => {'id': d['id'].toString(), 'name': d['name'].toString()})
            .toList();
        final names = _allDepartments
            .where((d) => ids.contains(d['id']))
            .map<String>((d) => d['name'])
            .toList();
        if (mounted) setState(() => _sharedWithNames = names);
      }
    } catch (_) {}
  }

  Future<void> _fetchDepartments() async {
    if (_allDepartments.isNotEmpty) return; // already loaded
    try {
      final headers = await _authHeaders();
      final res = await http.get(Uri.parse('$_baseUrl/departments/'), headers: headers);
      if (res.statusCode == 200) {
        final decoded = jsonDecode(res.body);
        final List depts = decoded is List ? decoded : (decoded['results'] ?? []);
        if (mounted) {
          setState(() {
            _allDepartments = depts
                .map<Map<String, dynamic>>((d) => {'id': d['id'].toString(), 'name': d['name'].toString()})
                .toList();
          });
        }
      }
    } catch (_) {}
  }

  Future<void> _fetchMessages() async {
    try {
      final headers = await _authHeaders();
      final uid = await _currentUserId();
      final res = await http.get(
        Uri.parse('$_baseUrl/messages/?report=${widget.reportId}'),
        headers: headers,
      );
      if (res.statusCode == 200 && mounted) {
        final decoded = jsonDecode(res.body);
        final List<dynamic> data = decoded is List ? decoded : (decoded['results'] ?? []);
        setState(() {
          _messages = data.map((m) => <String, dynamic>{
            'sender': m['sender'] == uid ? 'me' : 'other',
            'text': m['content'] ?? '',
            'time': (m['created_at'] ?? '').toString().length >= 16
                ? m['created_at'].toString().substring(11, 16)
                : '',
            'sender_name': m['sender_name'] ?? 'Unknown',
          }).toList();
        });
      }
    } catch (e) {
      debugPrint('Error fetching messages: $e');
    }
  }

  Future<void> _fetchDeptMessages() async {
    if (_primaryDeptId.isEmpty) return;
    if (mounted) setState(() => _isLoadingDeptMessages = true);
    try {
      final headers = await _authHeaders();
      final res = await http.get(
        Uri.parse('$_baseUrl/dept-messages/?department=$_primaryDeptId'),
        headers: headers,
      );
      if (res.statusCode == 200 && mounted) {
        final decoded = jsonDecode(res.body);
        final List<dynamic> data = decoded is List ? decoded : (decoded['results'] ?? []);
        final uid = await _currentUserId();
        setState(() {
          _deptMessages = data.map((m) => <String, dynamic>{
            'sender': m['sender'] == uid ? 'me' : 'other',
            'text': m['content'] ?? '',
            'time': (m['created_at'] ?? '').toString().length >= 16
                ? m['created_at'].toString().substring(11, 16)
                : '',
            'sender_name': m['sender_name'] ?? 'Unknown',
            'sender_dept': m['sender_dept_name'] ?? '',
          }).toList();
          _isLoadingDeptMessages = false;
        });
      } else {
        if (mounted) setState(() => _isLoadingDeptMessages = false);
      }
    } catch (e) {
      debugPrint('Error fetching dept messages: $e');
      if (mounted) setState(() => _isLoadingDeptMessages = false);
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  Future<void> _sendCitizenMessage() async {
    final text = _chatController.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _messages.add({'sender': 'me', 'text': text, 'time': 'Sending...', 'sender_name': 'You'});
      _chatController.clear();
    });
    try {
      final headers = await _authHeaders();
      final res = await http.post(
        Uri.parse('$_baseUrl/messages/'),
        headers: headers,
        body: jsonEncode({'report': int.tryParse(widget.reportId) ?? widget.reportId, 'content': text}),
      );
      if (res.statusCode == 201) {
        _fetchMessages();
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error ${res.statusCode}: ${res.body}'), backgroundColor: Colors.red),
        );
        setState(() => _messages.removeLast());
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Network error: $e'), backgroundColor: Colors.red),
        );
        setState(() => _messages.removeLast());
      }
    }
  }

  Future<void> _sendDeptMessage() async {
    final text = _deptChatController.text.trim();
    if (text.isEmpty || _primaryDeptId.isEmpty) return;
    setState(() {
      _deptMessages.add({'sender': 'me', 'text': text, 'time': 'Sending...', 'sender_name': 'You', 'sender_dept': ''});
      _deptChatController.clear();
    });
    try {
      final headers = await _authHeaders();
      final res = await http.post(
        Uri.parse('$_baseUrl/dept-messages/'),
        headers: headers,
        body: jsonEncode({
          'department': int.tryParse(_primaryDeptId) ?? _primaryDeptId,
          'content': text,
        }),
      );
      if (res.statusCode == 201) {
        _fetchDeptMessages();
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error ${res.statusCode}: ${res.body}'), backgroundColor: Colors.red),
        );
        setState(() => _deptMessages.removeLast());
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Network error: $e'), backgroundColor: Colors.red),
        );
        setState(() => _deptMessages.removeLast());
      }
    }
  }

  Future<void> _shareWithDepartment(String deptId, String deptName) async {
    try {
      final headers = await _authHeaders();
      final res = await http.post(
        Uri.parse('$_baseUrl/reports/${widget.reportId}/share_report/'),
        headers: headers,
        body: jsonEncode({'department_id': int.tryParse(deptId) ?? deptId}),
      );
      if (res.statusCode == 200 && mounted) {
        setState(() {
          if (!_sharedWithNames.contains(deptName)) {
            _sharedWithNames.add(deptName);
          }
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Report shared with $deptName'),
            backgroundColor: Colors.green[700],
          ),
        );
      } else if (res.statusCode == 403) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Only department managers or city admins can share reports.'),
            backgroundColor: Colors.red,
          ),
        );
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to share: ${res.body}'), backgroundColor: Colors.red),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Network error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _showShareDialog() async {
    await _fetchDepartments();
    if (!mounted) return;

    // Filter out the primary dept and already-shared depts
    final available = _allDepartments.where((d) {
      if (d['id'] == _primaryDeptId) return false;
      if (_sharedWithNames.contains(d['name'])) return false;
      return true;
    }).toList();

    if (available.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No additional departments to share with.')),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.share, color: Colors.indigo[700], size: 22),
            const SizedBox(width: 8),
            const Text('Share with Department'),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView.separated(
            shrinkWrap: true,
            itemCount: available.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (ctx, i) {
              final dept = available[i];
              return ListTile(
                leading: CircleAvatar(
                  backgroundColor: Colors.indigo[50],
                  child: Icon(Icons.account_balance, size: 18, color: Colors.indigo[700]),
                ),
                title: Text(dept['name'], style: const TextStyle(fontSize: 13)),
                trailing: Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey[400]),
                onTap: () {
                  Navigator.pop(ctx);
                  _shareWithDepartment(dept['id'], dept['name']);
                },
              );
            },
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        ],
      ),
    );
  }

  void _submitFeedback() {
    if (_rating == 0 || _isSatisfied == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a rating and satisfaction level.')),
      );
      return;
    }
    setState(() => _feedbackSubmitted = true);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Feedback submitted. Thank you!'), backgroundColor: Colors.green),
    );
  }

  Future<void> _downloadReceipt() async {
    final pdf = pw.Document();
    pdf.addPage(
      pw.Page(
        build: (pw.Context context) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text('Adama Smart Citizen', style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 8),
            pw.Text('Incident Report Receipt', style: pw.TextStyle(fontSize: 18, color: PdfColors.grey700)),
            pw.Divider(),
            pw.SizedBox(height: 20),
            pw.Text('Case Number: ${widget.caseNumber}', style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 10),
            pw.Text('Status: ${_status.replaceAll("_", " ")}'),
            pw.SizedBox(height: 10),
            pw.Text('Priority: $_priority'),
            pw.SizedBox(height: 10),
            pw.Text('Department: $_department'),
            pw.SizedBox(height: 10),
            pw.Text('Date Submitted: ${_createdAt.toString()}'),
            if (_sharedWithNames.isNotEmpty) ...[
              pw.SizedBox(height: 10),
              pw.Text('Also Shared With: ${_sharedWithNames.join(", ")}'),
            ],
            pw.SizedBox(height: 20),
            pw.Text('Description:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 5),
            pw.Text(_description),
            pw.Spacer(),
            pw.Divider(),
            pw.Center(child: pw.Text('Thank you for making Adama a better city.', style: pw.TextStyle(color: PdfColors.grey))),
          ],
        ),
      ),
    );
    await Printing.layoutPdf(onLayout: (PdfPageFormat format) async => pdf.save());
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    if (_isLoadingReport) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.caseNumber)),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    // Tab labels — 3rd tab only shown to officers/managers
    final tabs = [
      _TabItem(label: 'Details', icon: Icons.info_outline),
      _TabItem(label: 'Chat', icon: Icons.chat_bubble_outline),
      if (_canShareOrViewDeptChannel)
        _TabItem(label: 'Dept Channel', icon: Icons.groups_outlined),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.caseNumber),
        actions: [
          // Share button — only for officers/managers
          if (_canShareOrViewDeptChannel)
            IconButton(
              icon: const Icon(Icons.share_outlined),
              tooltip: 'Share with Department',
              onPressed: _showShareDialog,
            ),
          IconButton(
            icon: const Icon(Icons.picture_as_pdf),
            tooltip: 'Download Receipt',
            onPressed: _downloadReceipt,
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Tab bar ──
          Container(
            color: Colors.white,
            child: Row(
              children: List.generate(tabs.length, (i) {
                final isSelected = _currentTab == i;
                return Expanded(
                  child: GestureDetector(
                    onTap: () {
                      setState(() => _currentTab = i);
                      // Lazy-load dept messages when switching to that tab
                      if (i == 2 && _deptMessages.isEmpty) _fetchDeptMessages();
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: isSelected ? Colors.green : Colors.transparent,
                            width: 3,
                          ),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(tabs[i].icon, size: 16, color: isSelected ? Colors.green[800] : Colors.grey),
                          const SizedBox(width: 6),
                          Text(
                            tabs[i].label,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: isSelected ? Colors.green[800] : Colors.grey,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),

          // ── Content ──
          Expanded(
            child: IndexedStack(
              index: _currentTab,
              children: [
                _buildDetailsTab(),
                _buildChatTab(),
                if (_canShareOrViewDeptChannel) _buildDeptChannelTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Details tab ───────────────────────────────────────────────────────────

  Widget _buildDetailsTab() {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Status / priority header
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [_statusColor(_status), _statusColor(_status).withValues(alpha: 0.7)]),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(20)),
                      child: Text(_status.replaceAll('_', ' '), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: _priorityColor(_priority).withValues(alpha: 0.3), borderRadius: BorderRadius.circular(8)),
                      child: Text(_priority, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 11)),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(_department, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(widget.caseNumber, style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 14)),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // ── Shared-with section ──────────────────────────────────
                if (_sharedWithNames.isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.indigo[50],
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.indigo[100]!),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.share, size: 16, color: Colors.indigo[700]),
                            const SizedBox(width: 6),
                            Text(
                              'Shared With',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.indigo[800]),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 6,
                          children: _sharedWithNames.map((name) => Chip(
                            avatar: Icon(Icons.account_balance, size: 14, color: Colors.indigo[700]),
                            label: Text(name, style: const TextStyle(fontSize: 11)),
                            backgroundColor: Colors.indigo[100],
                            padding: EdgeInsets.zero,
                            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          )).toList(),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // ── Share button (officers/managers only) ────────────────
                if (_canShareOrViewDeptChannel) ...[
                  OutlinedButton.icon(
                    icon: const Icon(Icons.share_outlined, size: 18),
                    label: const Text('Share with Another Department'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.indigo[700],
                      side: BorderSide(color: Colors.indigo[300]!),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: _showShareDialog,
                  ),
                  const SizedBox(height: 20),
                ],

                // ── Feedback (resolved / closed) ─────────────────────────
                if ((_status == 'RESOLVED' || _status == 'CLOSED') && !_feedbackSubmitted) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.orange[50],
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.orange[200]!),
                    ),
                    child: Column(
                      children: [
                        Text('Rate Your Experience', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.orange[900])),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: List.generate(5, (idx) => IconButton(
                            icon: Icon(idx < _rating ? Icons.star : Icons.star_border, size: 32, color: Colors.orange),
                            onPressed: () => setState(() => _rating = idx + 1),
                          )),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            ChoiceChip(label: const Text('Satisfied'), selected: _isSatisfied == true, selectedColor: Colors.green[200], onSelected: (v) => setState(() => _isSatisfied = true)),
                            const SizedBox(width: 12),
                            ChoiceChip(label: const Text('Not Satisfied'), selected: _isSatisfied == false, selectedColor: Colors.red[200], onSelected: (v) => setState(() => _isSatisfied = false)),
                          ],
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _feedbackController,
                          decoration: const InputDecoration(hintText: 'Leave a comment... (optional)', filled: true, fillColor: Colors.white, border: OutlineInputBorder()),
                          maxLines: 2,
                        ),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: _submitFeedback,
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
                          child: const Text('Submit Feedback', style: TextStyle(color: Colors.white)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],

                // ── Description ──────────────────────────────────────────
                _DetailSection(title: 'Description', icon: Icons.description, child: Text(_description, style: const TextStyle(fontSize: 14, height: 1.6))),
                const SizedBox(height: 16),

                // ── Info grid ────────────────────────────────────────────
                Row(
                  children: [
                    Expanded(child: _InfoTile(icon: Icons.business, label: 'Department', value: _department)),
                    const SizedBox(width: 12),
                    Expanded(child: _InfoTile(icon: Icons.category, label: 'Category', value: _category)),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _InfoTile(icon: Icons.calendar_today, label: 'Submitted', value: _formatDate(_createdAt))),
                    const SizedBox(width: 12),
                    Expanded(child: _InfoTile(icon: Icons.person, label: 'Citizen', value: _citizenName)),
                  ],
                ),
                const SizedBox(height: 24),

                // ── Progress timeline ────────────────────────────────────
                _DetailSection(title: 'Report Progress', icon: Icons.timeline, child: _StatusWorkflow(currentStatus: _status)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Citizen chat tab ──────────────────────────────────────────────────────

  Widget _buildChatTab() {
    return Column(
      children: [
        Expanded(
          child: _messages.isEmpty
              ? Center(child: Text('No messages yet. Send the first message!', style: TextStyle(color: Colors.grey[500])))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _messages.length,
                  itemBuilder: (_, i) => _ChatBubble(msg: _messages[i], myKey: 'me'),
                ),
        ),
        _ChatInputBar(controller: _chatController, onSend: _sendCitizenMessage, hint: 'Message the department officer...'),
      ],
    );
  }

  // ── Department channel tab ────────────────────────────────────────────────

  Widget _buildDeptChannelTab() {
    return Column(
      children: [
        // Info banner
        Container(
          margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.indigo[50],
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.indigo[100]!),
          ),
          child: Row(
            children: [
              Icon(Icons.groups, size: 18, color: Colors.indigo[700]),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Internal channel for $_department${_sharedWithNames.isNotEmpty ? " + ${_sharedWithNames.join(", ")}" : ""}',
                  style: TextStyle(fontSize: 12, color: Colors.indigo[800]),
                ),
              ),
              IconButton(
                icon: Icon(Icons.refresh, size: 18, color: Colors.indigo[600]),
                onPressed: _fetchDeptMessages,
                tooltip: 'Refresh',
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
        ),

        // Messages
        Expanded(
          child: _isLoadingDeptMessages
              ? const Center(child: CircularProgressIndicator())
              : _deptMessages.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.forum_outlined, size: 48, color: Colors.grey[300]),
                          const SizedBox(height: 12),
                          Text('No department messages yet.', style: TextStyle(color: Colors.grey[500])),
                          const SizedBox(height: 4),
                          Text('Start a discussion with other departments.', style: TextStyle(fontSize: 12, color: Colors.grey[400])),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: _deptMessages.length,
                      itemBuilder: (_, i) => _DeptChatBubble(msg: _deptMessages[i]),
                    ),
        ),

        _ChatInputBar(
          controller: _deptChatController,
          onSend: _sendDeptMessage,
          hint: 'Message all departments on this report...',
          accentColor: Colors.indigo,
        ),
      ],
    );
  }

  // ── Utility ───────────────────────────────────────────────────────────────

  Color _statusColor(String s) {
    switch (s) {
      case 'SUBMITTED': return Colors.indigo;
      case 'RECEIVED': return Colors.purple;
      case 'ASSIGNED': return Colors.blue;
      case 'UNDER_INVESTIGATION': return Colors.amber[700]!;
      case 'IN_PROGRESS': return Colors.orange;
      case 'RESOLVED': return Colors.green;
      case 'CLOSED': return Colors.grey;
      case 'REOPENED': return Colors.red;
      default: return Colors.grey;
    }
  }

  Color _priorityColor(String p) {
    switch (p) {
      case 'CRITICAL': return Colors.red;
      case 'HIGH': return Colors.orange;
      case 'MEDIUM': return Colors.blue;
      case 'LOW': return Colors.grey;
      default: return Colors.grey;
    }
  }

  String _formatDate(DateTime dt) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
  }
}

// ── Supporting widgets ────────────────────────────────────────────────────────

class _TabItem {
  final String label;
  final IconData icon;
  const _TabItem({required this.label, required this.icon});
}

class _ChatBubble extends StatelessWidget {
  final Map<String, dynamic> msg;
  final String myKey;
  const _ChatBubble({required this.msg, required this.myKey});

  @override
  Widget build(BuildContext context) {
    final isMe = msg['sender'] == myKey;
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: isMe ? Colors.green[100] : Colors.grey[200],
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isMe ? 16 : 0),
            bottomRight: Radius.circular(isMe ? 0 : 16),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isMe ? 'You' : (msg['sender_name'] ?? 'Unknown'),
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isMe ? Colors.green[800] : Colors.grey[700]),
            ),
            const SizedBox(height: 2),
            Text(msg['text'] ?? '', style: const TextStyle(fontSize: 14)),
            const SizedBox(height: 4),
            Text(msg['time'] ?? '', style: TextStyle(fontSize: 10, color: Colors.grey[600])),
          ],
        ),
      ),
    );
  }
}

class _DeptChatBubble extends StatelessWidget {
  final Map<String, dynamic> msg;
  const _DeptChatBubble({required this.msg});

  @override
  Widget build(BuildContext context) {
    final isMe = msg['sender'] == 'me';
    final deptLabel = msg['sender_dept'] as String? ?? '';
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
        decoration: BoxDecoration(
          color: isMe ? Colors.indigo[50] : Colors.grey[100],
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isMe ? 16 : 0),
            bottomRight: Radius.circular(isMe ? 0 : 16),
          ),
          border: Border.all(color: isMe ? Colors.indigo[100]! : Colors.grey[300]!),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  isMe ? 'You' : (msg['sender_name'] ?? 'Unknown'),
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isMe ? Colors.indigo[800] : Colors.grey[700]),
                ),
                if (deptLabel.isNotEmpty) ...[
                  const SizedBox(width: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(color: Colors.indigo[100], borderRadius: BorderRadius.circular(6)),
                    child: Text(deptLabel, style: TextStyle(fontSize: 9, color: Colors.indigo[700])),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 2),
            Text(msg['text'] ?? '', style: const TextStyle(fontSize: 14)),
            const SizedBox(height: 4),
            Text(msg['time'] ?? '', style: TextStyle(fontSize: 10, color: Colors.grey[600])),
          ],
        ),
      ),
    );
  }
}

class _ChatInputBar extends StatelessWidget {
  final TextEditingController controller;
  final VoidCallback onSend;
  final String hint;
  final MaterialColor accentColor;

  const _ChatInputBar({
    required this.controller,
    required this.onSend,
    required this.hint,
    this.accentColor = Colors.green,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -5))],
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              decoration: InputDecoration(
                hintText: hint,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                filled: true,
                fillColor: Colors.grey[100],
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              ),
              onSubmitted: (_) => onSend(),
            ),
          ),
          const SizedBox(width: 8),
          CircleAvatar(
            backgroundColor: accentColor[700],
            child: IconButton(
              icon: const Icon(Icons.send, color: Colors.white, size: 18),
              onPressed: onSend,
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailSection extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget child;

  const _DetailSection({required this.title, required this.icon, required this.child});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(children: [
          Icon(icon, size: 18, color: Colors.green[700]),
          const SizedBox(width: 8),
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        ]),
        const SizedBox(height: 12),
        child,
      ],
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoTile({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(icon, size: 14, color: Colors.grey[500]),
            const SizedBox(width: 6),
            Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[500], fontWeight: FontWeight.w500)),
          ]),
          const SizedBox(height: 6),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600), maxLines: 2, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}

class _StatusWorkflow extends StatelessWidget {
  final String currentStatus;

  const _StatusWorkflow({required this.currentStatus});

  static const _steps = ['SUBMITTED', 'RECEIVED', 'ASSIGNED', 'UNDER_INVESTIGATION', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  static const _stepLabels = {
    'SUBMITTED': 'Submitted',
    'RECEIVED': 'Received',
    'ASSIGNED': 'Assigned',
    'UNDER_INVESTIGATION': 'Under Investigation',
    'IN_PROGRESS': 'In Progress',
    'RESOLVED': 'Resolved',
    'CLOSED': 'Closed',
  };

  @override
  Widget build(BuildContext context) {
    final currentIdx = _steps.indexOf(currentStatus);
    return Column(
      children: List.generate(_steps.length, (i) {
        final isPast = i <= currentIdx;
        final isCurrent = i == currentIdx;
        final isLast = i == _steps.length - 1;
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                Container(
                  width: isCurrent ? 20 : 14,
                  height: isCurrent ? 20 : 14,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isPast ? (isCurrent ? Colors.green : Colors.green[300]) : Colors.grey[300],
                    border: isCurrent ? Border.all(color: Colors.green.withValues(alpha: 0.3), width: 3) : null,
                  ),
                  child: isPast
                      ? Icon(isCurrent ? Icons.radio_button_checked : Icons.check, size: isCurrent ? 12 : 10, color: Colors.white)
                      : null,
                ),
                if (!isLast) Container(width: 2, height: 28, color: isPast ? Colors.green[300] : Colors.grey[200]),
              ],
            ),
            const SizedBox(width: 12),
            Padding(
              padding: const EdgeInsets.only(top: 1),
              child: Text(
                _stepLabels[_steps[i]] ?? _steps[i],
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                  color: isPast ? Colors.black87 : Colors.grey[400],
                ),
              ),
            ),
          ],
        );
      }),
    );
  }
}
