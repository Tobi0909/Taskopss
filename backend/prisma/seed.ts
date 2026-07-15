import { PrismaClient, Priority } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const isProduction = process.env.NODE_ENV === 'production';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@company.local';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? 'Quản trị viên';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
const BOARD_NAME = process.env.SEED_BOARD_NAME ?? 'Đội hạ tầng';
const BOARD_PREFIX = process.env.SEED_BOARD_PREFIX ?? 'INF';

const DEFAULT_TAGS = [
  ['monitoring', '#4C8DFF'],
  ['network', '#F5A524'],
  ['security', '#F0575A'],
  ['on-prem-ai', '#22B8B0'],
  ['database', '#6B7280'],
  ['incident', '#F0575A'],
] as const;

async function main() {
  if (isProduction && ADMIN_PASSWORD === 'ChangeMe123!') {
    console.warn(
      '⚠️  Đang seed ở môi trường production với mật khẩu admin mặc định. ' +
        'Hãy đặt biến SEED_ADMIN_PASSWORD trước khi deploy thật, rồi đổi mật khẩu ngay sau lần đăng nhập đầu tiên.',
    );
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      passwordHash,
      role: 'ADMIN',
      avatarColor: '#22B8B0',
    },
  });

  const board = await prisma.board.upsert({
    where: { keyPrefix: BOARD_PREFIX },
    update: {},
    create: {
      name: BOARD_NAME,
      keyPrefix: BOARD_PREFIX,
      createdById: admin.id,
      columns: {
        create: [
          { name: 'Tồn đọng', position: 0, isDoneColumn: false },
          { name: 'Cần làm', position: 1, isDoneColumn: false },
          { name: 'Cần xử lý gấp', position: 2, isDoneColumn: false },
          { name: 'Đang xử lý', position: 3, isDoneColumn: false },
          { name: 'Chờ duyệt', position: 4, isDoneColumn: false },
          { name: 'Hoàn thành', position: 5, isDoneColumn: true },
        ],
      },
    },
    include: { columns: true },
  });

  await Promise.all(
    DEFAULT_TAGS.map(([name, color]) =>
      prisma.tag.upsert({ where: { name }, update: {}, create: { name, color } }),
    ),
  );

  console.log('Seed hoàn tất.');
  console.log(`  Board: "${board.name}" (${board.keyPrefix}-xxx)`);
  console.log(`  Admin: ${ADMIN_EMAIL}`);
  if (!isProduction) {
    await seedDemoData(admin.id, board.id);
  } else {
    console.log('  NODE_ENV=production — bỏ qua dữ liệu demo (thành viên/task mẫu).');
  }
}

async function seedDemoData(adminId: string, boardId: string) {
  const passwordHash = await bcrypt.hash('ChangeMe123!', 10);

  const an = await prisma.user.upsert({
    where: { email: 'an.nguyen@company.local' },
    update: {},
    create: {
      email: 'an.nguyen@company.local',
      name: 'An Nguyễn',
      passwordHash,
      role: 'MEMBER',
      avatarColor: '#4C8DFF',
    },
  });

  const binh = await prisma.user.upsert({
    where: { email: 'binh.tran@company.local' },
    update: {},
    create: {
      email: 'binh.tran@company.local',
      name: 'Bình Trần',
      passwordHash,
      role: 'MEMBER',
      avatarColor: '#F5A524',
    },
  });

  const chi = await prisma.user.upsert({
    where: { email: 'chi.le@company.local' },
    update: {},
    create: {
      email: 'chi.le@company.local',
      name: 'Chi Lê',
      passwordHash,
      role: 'MEMBER',
      avatarColor: '#F0575A',
    },
  });

  const existingTaskCount = await prisma.task.count({ where: { boardId } });
  if (existingTaskCount > 0) {
    console.log('  Đã có task trong board, bỏ qua tạo task demo (tránh nhân đôi khi seed lại).');
    return;
  }

  const columns = await prisma.boardColumn.findMany({ where: { boardId } });
  const columnByName = Object.fromEntries(columns.map((c) => [c.name, c]));
  const tags = await prisma.tag.findMany();
  const tagByName = Object.fromEntries(tags.map((t) => [t.name, t]));

  const now = Date.now();
  const daysFromNow = (d: number) => new Date(now + d * 24 * 60 * 60 * 1000);

  type SeedTask = {
    title: string;
    description: string;
    priority: Priority;
    column: string;
    assignee: string | null;
    dueDate: Date | null;
    completedAt: Date | null;
    tagNames: string[];
  };

  const seedTasks: SeedTask[] = [
    {
      title: 'Node exporter down trên host db-03',
      description: 'Alert từ Prometheus: node_exporter không phản hồi trên db-03 từ 08:40.',
      priority: 'P1',
      column: 'Đang xử lý',
      assignee: an.id,
      dueDate: daysFromNow(0.25),
      completedAt: null,
      tagNames: ['monitoring', 'incident'],
    },
    {
      title: 'Rà soát rule firewall cho VLAN backup',
      description: 'Kiểm tra lại các rule đang mở thừa trên VLAN backup sau đợt audit bảo mật quý này.',
      priority: 'P2',
      column: 'Cần làm',
      assignee: binh.id,
      dueDate: daysFromNow(3),
      completedAt: null,
      tagNames: ['network', 'security'],
    },
    {
      title: 'Nâng cấp PostgreSQL 14 lên 16 cho cụm on-prem AI',
      description: 'Lên kế hoạch downtime, backup trước khi nâng cấp cụm Postgres phục vụ pipeline on-prem AI.',
      priority: 'P2',
      column: 'Tồn đọng',
      assignee: chi.id,
      dueDate: daysFromNow(10),
      completedAt: null,
      tagNames: ['database', 'on-prem-ai'],
    },
    {
      title: 'Thiết lập alert quá tải GPU cho cụm inference nội bộ',
      description: 'Cấu hình cảnh báo khi GPU utilization > 90% trong 10 phút liên tục.',
      priority: 'P3',
      column: 'Cần làm',
      assignee: an.id,
      dueDate: daysFromNow(5),
      completedAt: null,
      tagNames: ['monitoring', 'on-prem-ai'],
    },
    {
      title: 'Xoay vòng SSH key cho toàn bộ server vận hành',
      description: 'Định kỳ hàng quý — sinh key mới, phân phối, thu hồi key cũ trên toàn bộ fleet.',
      priority: 'P3',
      column: 'Chờ duyệt',
      assignee: binh.id,
      dueDate: daysFromNow(1),
      completedAt: null,
      tagNames: ['security'],
    },
    {
      title: 'Chuẩn hoá template Grafana dashboard cho các service mới',
      description: 'Gom các dashboard rời rạc thành 1 template chung, biến số hoá theo service name.',
      priority: 'P4',
      column: 'Tồn đọng',
      assignee: null,
      dueDate: null,
      completedAt: null,
      tagNames: ['monitoring'],
    },
    {
      title: 'Khắc phục sự cố mất kết nối switch tầng 3',
      description: 'Switch tầng 3 mất kết nối uplink lúc 02:15, đã failover sang link dự phòng.',
      priority: 'P1',
      column: 'Hoàn thành',
      assignee: chi.id,
      dueDate: daysFromNow(-2),
      completedAt: daysFromNow(-2),
      tagNames: ['network', 'incident'],
    },
    {
      title: 'Backup config router biên trước đợt bảo trì',
      description: 'Export toàn bộ running-config trước khi bảo trì định kỳ cuối tuần.',
      priority: 'P3',
      column: 'Hoàn thành',
      assignee: an.id,
      dueDate: daysFromNow(-5),
      completedAt: daysFromNow(-5),
      tagNames: ['network'],
    },
  ];

  for (const t of seedTasks) {
    const column = columnByName[t.column];
    const updatedBoard = await prisma.board.update({
      where: { id: boardId },
      data: { taskCounter: { increment: 1 } },
    });

    await prisma.task.create({
      data: {
        boardId,
        columnId: column.id,
        sequenceNumber: updatedBoard.taskCounter,
        title: t.title,
        description: t.description,
        priority: t.priority,
        assigneeId: t.assignee,
        createdById: adminId,
        dueDate: t.dueDate,
        completedAt: t.completedAt,
        position: 0,
        tags: { create: t.tagNames.map((name) => ({ tagId: tagByName[name].id })) },
        activityLogs: {
          create: { actorId: adminId, action: 'CREATED', metadata: {} },
        },
      },
    });
  }

  console.log('  Đã tạo dữ liệu demo (3 thành viên, 8 task mẫu). Mật khẩu chung: ChangeMe123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
