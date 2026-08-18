from core.models import RoutingRule, RoutingKeyword, Department

def route_report(description, category_id=None, is_emergency=False):
    """
    Rule-Based Intelligent Recommendation Engine.
    Do not use Generative AI.
    """
    description_lower = description.lower()
    
    # Emergency routing logic could override standard routing
    if is_emergency:
        # Emergency defaults (e.g., Police, Fire, Ambulance) could be retrieved here
        # For Adama, we might route to Qajeelcha Poolisii or Waajjira Fayyaa
        police_dept = Department.objects.filter(name="Qajeelcha Poolisii").first()
        if police_dept:
            return {'primary': police_dept, 'supporting': []}
            
    # Regular routing
    best_match_department = None
    highest_score = 0
    supporting = []
    
    rules = RoutingRule.objects.filter(is_active=True)
    
    for rule in rules:
        score = 0
        # Check category match
        if rule.category_id and rule.category_id == category_id:
            score += 10 # Category match carries high weight
            
        # Check keywords match
        keywords = rule.keywords.all()
        for kw in keywords:
            if kw.keyword.lower() in description_lower:
                score += 5 # Keyword match weight
                
        # Combine base priority
        score += rule.priority
        
        if score > highest_score:
            highest_score = score
            if best_match_department:
                supporting.append(best_match_department)
            best_match_department = rule.department
        elif score > 0 and rule.department != best_match_department:
            if rule.department not in supporting:
                supporting.append(rule.department)
                
    # Fallback to default department if no matches (e.g., Mana Qopheessaa)
    if not best_match_department:
        best_match_department = Department.objects.filter(name="Mana Qopheessaa").first()
        
    return {
        'primary': best_match_department,
        'supporting': supporting[:2] # Limit supporting departments to top 2
    }
