const { readUsersFile, writeUsersFile } = require('./lib/users');

const data = readUsersFile();
if (data.users) {
  data.users = data.users.map((user) => {
    if (user.role === 'teacher') {
      user.role = 'department_manager';
    }
    return user;
  });
  writeUsersFile(data);
  console.log('Updated teachers to department_managers');
} else {
  console.log('No users found');
}