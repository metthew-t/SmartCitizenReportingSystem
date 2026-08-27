import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'home_screen.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class ReportDetailsScreen extends StatefulWidget {
  final DemoReportItem? report;

  const ReportDetailsScreen({super.key, this.report});

  @override
  State<ReportDetailsScreen> createState() => _ReportDetailsScreenState();
}

class _ReportDetailsScreenState extends State<ReportDetailsScreen> {
  int _currentTab = 0; // 0: Details, 1: Chat

  // Chat State
  final _chatController = TextEditingController();
  List<Map<String, dynamic>> _messages = [];

  // Feedback State
  int _rating = 0;
  bool? _isSatisfied;
  final _feedbackController = TextEditingController();
  bool _feedbackSubmitted = false;

  late DemoReportItem r;

  @override
  void initState() {
    super.initState();
    r = widget.report ?? demoReports.first;
    _fetchMessages();
  }

  Future<void> _fetchMessages() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');
      final userId = prefs.getInt('user_id');
      final headers = {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

      final res = await http.get(
        Uri.parse('https://smartcitizenreportingsystem.onrender.com/api/v1/messages/?report=${r.id}'),
        headers: headers
      );
      if (res.statusCode == 200) {
        final decoded = jsonDecode(res.body);
        // Handle both paginated {"results": [...]} and plain list responses
        final List<dynamic> data = decoded is List ? decoded : (decoded['results'] ?? []);
        setState(() {
          _messages = data.map((m) {
            return <String, dynamic>{
              'sender': m['sender'] == userId ? 'citizen' : 'officer',
              'text': m['content'] ?? '',
              'time': m['created_at'] != null ? m['created_at'].toString().substring(11, 16) : '',
              'sender_name': m['sender_name'] ?? 'Unknown',
            };
          }).toList();
        });
      }
    } catch (e) {
      print('Error fetching messages: $e');
    }
  }

  @override
  void dispose() {
    _chatController.dispose();
    _feedbackController.dispose();
    super.dispose();
  }

  Future<void> _sendMessage() async {
    if (_chatController.text.trim().isEmpty) return;
    
    final text = _chatController.text;
    setState(() {
      _messages.add({
        'sender': 'citizen',
        'text': text,
        'time': 'Sending...',
      });
      _chatController.clear();
    });

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');
      final headers = {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

      final res = await http.post(
        Uri.parse('https://smartcitizenreportingsystem.onrender.com/api/v1/messages/'),
        headers: headers,
        body: jsonEncode({'report': r.id, 'content': text}),
      );
      if (res.statusCode == 201) {
        _fetchMessages();
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Chat Error ${res.statusCode}: ${res.body}'), backgroundColor: Colors.red)
        );
        // Remove the "Sending..." message
        setState(() {
          _messages.removeLast();
        });
      }
    } catch (e) {
      print('Error sending message: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Network error: $e'), backgroundColor: Colors.red)
        );
      }
    }
  }

  void _submitFeedback() {
    if (_rating == 0 || _isSatisfied == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select rating and satisfaction.')));
      return;
    }
    setState(() => _feedbackSubmitted = true);
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Feedback submitted. Thank you!')));
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
            pw.Text('Case Number: ${r.caseNumber}', style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 10),
            pw.Text('Title: ${r.title}'),
            pw.SizedBox(height: 10),
            pw.Text('Status: ${r.status.replaceAll("_", " ")}'),
            pw.SizedBox(height: 10),
            pw.Text('Priority: ${r.priority}'),
            pw.SizedBox(height: 10),
            pw.Text('Department: ${r.department}'),
            pw.SizedBox(height: 10),
            pw.Text('Date Submitted: ${r.createdAt.toString()}'),
            pw.SizedBox(height: 20),
            pw.Text('Description:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 5),
            pw.Text(r.description),
            pw.Spacer(),
            pw.Divider(),
            pw.Center(child: pw.Text('Thank you for making Adama a better city.', style: pw.TextStyle(color: PdfColors.grey))),
          ],
        ),
      ),
    );

    await Printing.layoutPdf(onLayout: (PdfPageFormat format) async => pdf.save());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(r.caseNumber),
        actions: [
          IconButton(
            icon: const Icon(Icons.picture_as_pdf),
            tooltip: 'Download Receipt',
            onPressed: _downloadReceipt,
          ),
        ],
      ),
      body: Column(
        children: [
          // Tab Bar
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _currentTab = 0),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(border: Border(bottom: BorderSide(color: _currentTab == 0 ? Colors.green : Colors.transparent, width: 3))),
                    child: Text('Details', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, color: _currentTab == 0 ? Colors.green[800] : Colors.grey)),
                  ),
                ),
              ),
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _currentTab = 1),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(border: Border(bottom: BorderSide(color: _currentTab == 1 ? Colors.green : Colors.transparent, width: 3))),
                    child: Text('Chat & Updates', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.bold, color: _currentTab == 1 ? Colors.green[800] : Colors.grey)),
                  ),
                ),
              ),
            ],
          ),

          // Content
          Expanded(
            child: _currentTab == 0 ? _buildDetailsTab() : _buildChatTab(),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailsTab() {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Status header
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(gradient: LinearGradient(colors: [_statusColor(r.status), _statusColor(r.status).withValues(alpha: 0.7)])),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(20)),
                      child: Text(r.status.replaceAll('_', ' '), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: _priorityColor(r.priority).withValues(alpha: 0.3), borderRadius: BorderRadius.circular(8)),
                      child: Text(r.priority, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 11)),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(r.title, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(r.caseNumber, style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 14)),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Feedback section (if resolved)
                if ((r.status == 'RESOLVED' || r.status == 'CLOSED') && !_feedbackSubmitted) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: Colors.orange[50], borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.orange[200]!)),
                    child: Column(
                      children: [
                        Text('Rate Your Experience', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.orange[900])),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: List.generate(5, (index) => IconButton(
                            icon: Icon(index < _rating ? Icons.star : Icons.star_border, size: 32, color: Colors.orange),
                            onPressed: () => setState(() => _rating = index + 1),
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
                        TextField(controller: _feedbackController, decoration: const InputDecoration(hintText: 'Leave a comment... (optional)', filled: true, fillColor: Colors.white, border: OutlineInputBorder()), maxLines: 2),
                        const SizedBox(height: 12),
                        ElevatedButton(onPressed: _submitFeedback, style: ElevatedButton.styleFrom(backgroundColor: Colors.orange), child: const Text('Submit Feedback', style: TextStyle(color: Colors.white))),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],

                // Description
                _DetailSection(title: 'Description', icon: Icons.description, child: Text(r.description, style: const TextStyle(fontSize: 14, height: 1.6))),
                const SizedBox(height: 16),

                // Details grid
                Row(
                  children: [
                    Expanded(child: _InfoTile(icon: Icons.business, label: 'Department', value: r.department)),
                    const SizedBox(width: 12),
                    Expanded(child: _InfoTile(icon: Icons.category, label: 'Category', value: r.category)),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _InfoTile(icon: Icons.calendar_today, label: 'Submitted', value: _formatDate(r.createdAt))),
                    const SizedBox(width: 12),
                    Expanded(child: _InfoTile(icon: Icons.person, label: 'Citizen', value: r.citizenName)),
                  ],
                ),
                const SizedBox(height: 24),

                // Status workflow
                _DetailSection(title: 'Report Progress', icon: Icons.timeline, child: _StatusWorkflow(currentStatus: r.status)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChatTab() {
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _messages.length,
            itemBuilder: (context, index) {
              final msg = _messages[index];
              final isMe = msg['sender'] == 'citizen';
              return Align(
                alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 12),
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
                      Text(msg['text'], style: const TextStyle(fontSize: 14)),
                      const SizedBox(height: 4),
                      Text(msg['time'], style: TextStyle(fontSize: 10, color: Colors.grey[600])),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -5))]),
          child: Row(
            children: [
              IconButton(icon: const Icon(Icons.attach_file), color: Colors.grey[600], onPressed: () {}),
              IconButton(icon: const Icon(Icons.mic), color: Colors.grey[600], onPressed: () {}),
              Expanded(
                child: TextField(
                  controller: _chatController,
                  decoration: InputDecoration(
                    hintText: 'Type a message...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                    filled: true,
                    fillColor: Colors.grey[100],
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              CircleAvatar(
                backgroundColor: Colors.green[700],
                child: IconButton(icon: const Icon(Icons.send, color: Colors.white, size: 18), onPressed: _sendMessage),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Color _statusColor(String status) {
    switch (status) {
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

  Color _priorityColor(String priority) {
    switch (priority) {
      case 'CRITICAL': return Colors.red;
      case 'HIGH': return Colors.orange;
      case 'MEDIUM': return Colors.blue;
      case 'LOW': return Colors.grey;
      default: return Colors.grey;
    }
  }

  String _formatDate(DateTime dt) {
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
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
        Row(children: [Icon(icon, size: 18, color: Colors.green[700]), const SizedBox(width: 8), Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold))]),
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
      decoration: BoxDecoration(color: Colors.grey[50], borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey[200]!)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [Icon(icon, size: 14, color: Colors.grey[500]), const SizedBox(width: 6), Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[500], fontWeight: FontWeight.w500))]),
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
  static const _stepLabels = {'SUBMITTED': 'Submitted', 'RECEIVED': 'Received', 'ASSIGNED': 'Assigned', 'UNDER_INVESTIGATION': 'Investigating', 'IN_PROGRESS': 'In Progress', 'RESOLVED': 'Resolved', 'CLOSED': 'Closed'};

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
                  width: isCurrent ? 20 : 14, height: isCurrent ? 20 : 14,
                  decoration: BoxDecoration(shape: BoxShape.circle, color: isPast ? (isCurrent ? Colors.green : Colors.green[300]) : Colors.grey[300], border: isCurrent ? Border.all(color: Colors.green.withValues(alpha: 0.3), width: 3) : null),
                  child: isPast ? Icon(isCurrent ? Icons.radio_button_checked : Icons.check, size: isCurrent ? 12 : 10, color: Colors.white) : null,
                ),
                if (!isLast) Container(width: 2, height: 28, color: isPast ? Colors.green[300] : Colors.grey[200]),
              ],
            ),
            const SizedBox(width: 12),
            Padding(
              padding: const EdgeInsets.only(top: 0),
              child: Text(_stepLabels[_steps[i]] ?? _steps[i], style: TextStyle(fontSize: 13, fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal, color: isPast ? Colors.black87 : Colors.grey[400])),
            ),
          ],
        );
      }),
    );
  }
}
