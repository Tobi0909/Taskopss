import { buildLastNWeeks, startOfIsoWeek } from './dashboard.utils';

describe('startOfIsoWeek', () => {
  it('trả về thứ Hai của tuần đó khi input là giữa tuần (thứ Năm)', () => {
    expect(startOfIsoWeek(new Date('2026-07-09T10:00:00Z'))).toBe('2026-07-06');
  });

  it('trả về đúng ngày khi input đã là thứ Hai', () => {
    expect(startOfIsoWeek(new Date('2026-07-06T00:00:00Z'))).toBe('2026-07-06');
  });

  it('xử lý đúng khi input là Chủ nhật (thuộc tuần trước đó)', () => {
    expect(startOfIsoWeek(new Date('2026-07-12T23:00:00Z'))).toBe('2026-07-06');
  });
});

describe('buildLastNWeeks', () => {
  it('trả về đúng n tuần, thứ tự tăng dần theo thời gian, kết thúc ở tuần hiện tại', () => {
    const weeks = buildLastNWeeks(new Date('2026-07-09T00:00:00Z'), 4);
    expect(weeks).toEqual(['2026-06-15', '2026-06-22', '2026-06-29', '2026-07-06']);
  });
});
