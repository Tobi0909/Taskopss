import { extractMentionedUserIds } from './mentions';

describe('extractMentionedUserIds', () => {
  it('lấy đúng userId từ cú pháp @[Tên](uuid)', () => {
    const body = 'Nhờ @[An Nguyễn](11111111-1111-4111-8111-111111111111) xem hộ cái này';
    expect(extractMentionedUserIds(body)).toEqual(['11111111-1111-4111-8111-111111111111']);
  });

  it('lấy nhiều mention và loại trùng lặp', () => {
    const body =
      '@[An](11111111-1111-4111-8111-111111111111) và @[Bình](22222222-2222-4222-8222-222222222222), ' +
      'nhắc lại @[An](11111111-1111-4111-8111-111111111111)';
    expect(extractMentionedUserIds(body)).toEqual([
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ]);
  });

  it('trả về mảng rỗng nếu không có mention', () => {
    expect(extractMentionedUserIds('Không có ai được nhắc ở đây cả')).toEqual([]);
  });

  it('bỏ qua text giống mention nhưng sai định dạng id', () => {
    expect(extractMentionedUserIds('@[An](not-a-uuid)')).toEqual([]);
  });
});
