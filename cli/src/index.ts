#!/usr/bin/env node
import { Command } from 'commander';
import { loginCommand } from './commands/login';
import { logoutCommand } from './commands/logout';
import { whoamiCommand } from './commands/whoami';
import { boardsListCommand, boardsShowCommand } from './commands/boards';
import { tagsListCommand } from './commands/tags';
import { usersListCommand } from './commands/users';
import {
  tasksCreateCommand,
  tasksDeleteCommand,
  tasksGetCommand,
  tasksListCommand,
  tasksMoveCommand,
  tasksSetTagsCommand,
  tasksUpdateCommand,
} from './commands/tasks';

const program = new Command();
program.name('taskops').description('CLI để thao tác task TaskOps từ máy local').version('0.1.0');

program
  .command('login')
  .description('Đăng nhập vào TaskOps và lưu phiên cục bộ')
  .option('--url <apiUrl>', 'Địa chỉ backend, VD http://localhost:4000')
  .action(loginCommand);

program.command('logout').description('Đăng xuất và xoá phiên cục bộ').action(logoutCommand);
program.command('whoami').description('Hiển thị tài khoản đang đăng nhập').action(whoamiCommand);

const boards = program.command('boards').description('Quản lý board');
boards
  .command('list')
  .description('Liệt kê board')
  .option('--json', 'In dạng JSON')
  .action(boardsListCommand);
boards
  .command('show <board>')
  .description('Xem chi tiết board và các cột (board = keyPrefix, tên, hoặc id)')
  .option('--json', 'In dạng JSON')
  .action(boardsShowCommand);

const tags = program.command('tags').description('Quản lý tag');
tags.command('list').description('Liệt kê tag').option('--json', 'In dạng JSON').action(tagsListCommand);

const users = program.command('users').description('Quản lý thành viên');
users
  .command('list')
  .description('Liệt kê thành viên')
  .option('--json', 'In dạng JSON')
  .action(usersListCommand);

const tasks = program.command('tasks').description('Quản lý task');

tasks
  .command('list')
  .description('Liệt kê task, lọc theo tuỳ chọn')
  .option('--board <board>', 'Lọc theo board (keyPrefix, tên, hoặc id)')
  .option('--assignee <email>', 'Lọc theo email người được gán')
  .option('--priority <priority>', 'Lọc theo priority (P1-P4)')
  .option('--tag <tag>', 'Lọc theo tên tag')
  .option('--q <text>', 'Tìm theo tiêu đề')
  .option('--overdue', 'Chỉ hiện task quá hạn')
  .option('--json', 'In dạng JSON')
  .action(tasksListCommand);

tasks
  .command('get <id>')
  .description('Xem chi tiết một task')
  .option('--json', 'In dạng JSON')
  .action(tasksGetCommand);

tasks
  .command('create')
  .description('Tạo task mới — đẩy task từ local lên TaskOps')
  .requiredOption('--board <board>', 'Board (keyPrefix, tên, hoặc id)')
  .requiredOption('--column <column>', 'Tên cột (hoặc id)')
  .requiredOption('--title <title>', 'Tiêu đề task')
  .option('--description <text>', 'Mô tả')
  .option('--priority <priority>', 'P1-P4 (mặc định P3)')
  .option('--assignee <email>', 'Email người được gán')
  .option('--due <date>', 'Hạn chót, định dạng ISO (VD 2026-08-01)')
  .option('--tags <tags>', 'Danh sách tag, phân tách bởi dấu phẩy')
  .action(tasksCreateCommand);

tasks
  .command('update <id>')
  .description('Cập nhật task')
  .option('--title <title>')
  .option('--description <text>')
  .option('--priority <priority>', 'P1-P4')
  .option('--assignee <email>', 'Email người được gán, hoặc "none" để bỏ gán')
  .option('--due <date>', 'Hạn chót ISO, hoặc "none" để xoá hạn')
  .action(tasksUpdateCommand);

tasks
  .command('move <id>')
  .description('Chuyển task sang cột khác')
  .requiredOption('--column <column>', 'Tên cột đích (hoặc id)')
  .option('--after <taskId>', 'Đặt vị trí ngay sau task này trong cột')
  .action(tasksMoveCommand);

tasks
  .command('set-tags <id>')
  .description('Gán lại toàn bộ tag cho task (ghi đè)')
  .option('--tags <tags>', 'Danh sách tag, phân tách bởi dấu phẩy (bỏ trống để xoá hết tag)')
  .action(tasksSetTagsCommand);

tasks
  .command('delete <id>')
  .description('Xoá task')
  .action(tasksDeleteCommand);

program.parseAsync(process.argv);
