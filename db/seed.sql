-- Minimal seed data for local/dev
INSERT INTO companies (id, name, business_number, industry, status, rep_name, rep_position, rep_phone, email, last_contact, notes)
VALUES
  ('11111111-1111-1111-1111-111111111111', '삼성전자', '123-45-67890', '제조/반도체', '제안', '김철수', '구매팀 부장', '010-1234-5678', 'cs.kim@samsung.com', '2024-11-24', '프리미엄 요금제 도입 검토 중.'),
  ('22222222-2222-2222-2222-222222222222', '현대자동차', '234-56-78901', '제조/자동차', '미팅', '이영희', '기술연구소 수석', '010-9876-5432', 'yh.lee@hyundai.com', '2024-11-22', 'PoC 진행 준비');

INSERT INTO contacts (id, company_id, name, title, email, phone, role, last_interaction)
VALUES
  ('aaaaaaa1-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '김철수', '구매팀 부장', 'cs.kim@samsung.com', '010-1234-5678', 'Economic Buyer', '2024-11-22'),
  ('aaaaaaa2-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '이영희', '기술연구소 수석', 'yh.lee@hyundai.com', '010-9876-5432', 'Technical Buyer', '2024-11-22');

INSERT INTO deals (id, company_id, contact_id, name, stage, amount, expected_close_date, status, owner)
VALUES
  ('ddddddd1-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaa1-0000-0000-0000-000000000001', '스마트 팩토리 모니터링 SaaS', '협상', 1200000000, '2025-01-20', '진행', '김지훈'),
  ('ddddddd2-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'aaaaaaa2-0000-0000-0000-000000000002', '연구소 협업 플랫폼', '제안', 450000000, '2024-12-15', '진행', '오세린');

INSERT INTO activities (id, company_id, contact_id, deal_id, type, summary, actor, occurred_at, next_step)
VALUES
  ('fffffff1-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaa1-0000-0000-0000-000000000001', 'ddddddd1-0000-0000-0000-000000000001', '회의', '2차 PoC 결과 공유', '김지훈', '2024-11-23T09:00:00Z', '수정 견적 송부'),
  ('fffffff2-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'aaaaaaa2-0000-0000-0000-000000000002', 'ddddddd2-0000-0000-0000-000000000002', '회의', 'R&D 요구사항 워크숍', '오세린', '2024-11-22T05:00:00Z', 'PoC 범위 정의서 전달');

INSERT INTO field_tracking_policies (id, entity_type, field_name, is_tracked, retention_days, max_length, exclude_long_text)
VALUES
  ('policy-1', 'Company', '에너지 등급', TRUE, 365, 255, TRUE),
  ('policy-2', 'Deal', '단계', TRUE, 365, 255, TRUE),
  ('policy-3', 'Company', '메모', FALSE, 90, 255, TRUE);

INSERT INTO change_logs (id, entity_type, entity_id, field_name, old_value, new_value, changed_by, changed_at, change_type, tracked)
VALUES
  ('ccccccc1-0000-0000-0000-000000000001', 'Deal', 'ddddddd1-0000-0000-0000-000000000001', '단계', '제안', '협상', '김지훈', '2024-11-24T11:00:00Z', 'APPROVAL', TRUE),
  ('ccccccc2-0000-0000-0000-000000000002', 'Company', '11111111-1111-1111-1111-111111111111', '에너지 등급', 'B', 'A', '김지훈', '2024-11-12T09:00:00Z', 'UPDATE', TRUE);

INSERT INTO change_logs (id, entity_type, entity_id, field_name, old_value, new_value, old_value_length, new_value_length, old_value_truncated, new_value_truncated, changed_by, changed_at, change_type, reason, tracked, latency_minutes, retention_expires_at, policy_id)
VALUES
  (
    'ccccccc3-0000-0000-0000-000000000003',
    'Company',
    '11111111-1111-1111-1111-111111111111',
    '메모',
    '...긴 메모 내용의 일부 (255자 스니펫)...',
    '...업데이트된 긴 메모 내용의 일부 (255자 스니펫)...',
    320,
    540,
    TRUE,
    TRUE,
    '정우석',
    '2024-11-16T01:20:00Z',
    'UPDATE',
    '장문의 회의 기록 업데이트',
    TRUE,
    60,
    '2025-11-16T01:20:00Z',
    'policy-3'
  );
