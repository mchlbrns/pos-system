const User = require('../../models/User');
const { getDatabase, initializeDatabase, closeDatabase } = require('../../database/init');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
  let db;
  let testBusinessId;
  let testUser;

  beforeAll(() => {
    process.env.DB_PATH = ':memory:';
    db = getDatabase();
    initializeDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  beforeEach(() => {
    db.exec(`
      DELETE FROM users;
      DELETE FROM businesses;
    `);

    // Create a dummy business for foreign key constraint
    const result = db.prepare(`
      INSERT INTO businesses (name, type) VALUES (?, ?)
    `).run('Test Business', 'waterstation');
    testBusinessId = result.lastInsertRowid;

    // Create a base user to use in various tests
    testUser = User.create({
      business_id: testBusinessId,
      username: 'test_cashier',
      password: 'password123',
      role: 'cashier',
      full_name: 'Test Cashier'
    });
  });

  describe('create', () => {
    it('should create a new user and return the user object', () => {
      const userData = {
        business_id: testBusinessId,
        username: 'new_user',
        password: 'securepassword',
        role: 'manager',
        full_name: 'New User'
      };

      const user = User.create(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.username).toBe('new_user');
      expect(user.full_name).toBe('New User');
      expect(user.role).toBe('manager');
      expect(user.is_active).toBe(1);

      // Verify that the password is hashed in the database
      const storedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      expect(storedUser.password_hash).toBeDefined();
      expect(storedUser.password_hash).not.toBe('securepassword');
      expect(bcrypt.compareSync('securepassword', storedUser.password_hash)).toBe(true);
    });

    it('should use default role "cashier" if role is not provided', () => {
      const userData = {
        business_id: testBusinessId,
        username: 'default_role_user',
        password: 'securepassword',
        full_name: 'Default Role User'
      };

      const user = User.create(userData);
      expect(user.role).toBe('cashier');
    });

    it('should fail to create a user with duplicate username', () => {
      expect(() => {
        User.create({
          business_id: testBusinessId,
          username: 'test_cashier', // Already exists from beforeEach
          password: 'newpassword',
          full_name: 'Duplicate User'
        });
      }).toThrow(/UNIQUE constraint failed: users.username/);
    });
  });

  describe('findById', () => {
    it('should find a user by their ID', () => {
      const user = User.findById(testUser.id);
      expect(user).toBeDefined();
      expect(user.id).toBe(testUser.id);
      expect(user.username).toBe('test_cashier');
      expect(user.password_hash).toBeUndefined(); // Should not return password_hash
    });

    it('should return null for non-existent ID', () => {
      const user = User.findById(9999);
      expect(user).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should find a user by their username, including password_hash', () => {
      const user = User.findByUsername('test_cashier');
      expect(user).toBeDefined();
      expect(user.username).toBe('test_cashier');
      expect(user.password_hash).toBeDefined(); // Need this for authentication
    });

    it('should return null for non-existent username', () => {
      const user = User.findByUsername('nonexistent_user');
      expect(user).toBeNull();
    });
  });

  describe('findByBusiness', () => {
    it('should return all users for a specific business, ordered by full_name', () => {
      // Create another user
      User.create({
        business_id: testBusinessId,
        username: 'admin_user',
        password: 'password',
        role: 'admin',
        full_name: 'Admin User' // 'A' comes before 'T'
      });

      const users = User.findByBusiness(testBusinessId);
      expect(users.length).toBe(2);
      expect(users[0].full_name).toBe('Admin User');
      expect(users[1].full_name).toBe('Test Cashier');
      expect(users[0].password_hash).toBeUndefined(); // Should not return password_hash
    });

    it('should return an empty array if business has no users', () => {
      const users = User.findByBusiness(9999);
      expect(users).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update allowed fields of a user', () => {
      const updatedData = {
        full_name: 'Updated Name',
        role: 'manager',
        is_active: 0
      };

      const user = User.update(testUser.id, updatedData);

      expect(user.full_name).toBe('Updated Name');
      expect(user.role).toBe('manager');
      expect(user.is_active).toBe(0);
    });

    it('should ignore non-allowed fields', () => {
      const originalUsername = testUser.username;
      const updatedData = {
        full_name: 'Updated Name',
        username: 'hacked_username', // Not allowed
        password_hash: 'hacked_hash' // Not allowed
      };

      const user = User.update(testUser.id, updatedData);

      expect(user.full_name).toBe('Updated Name');
      expect(user.username).toBe(originalUsername);

      // Verify password was not changed
      const dbUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      expect(dbUser.username).toBe(originalUsername);
      expect(dbUser.password_hash).not.toBe('hacked_hash');
    });

    it('should return current user if no fields to update', () => {
      const user = User.update(testUser.id, {});
      expect(user.full_name).toBe(testUser.full_name);
    });
  });

  describe('changePassword', () => {
    it('should change a user password', () => {
      const newPassword = 'new_secure_password';
      const success = User.changePassword(testUser.id, newPassword);

      expect(success).toBe(true);

      // Verify the new password hash
      const dbUser = db.prepare('SELECT * FROM users WHERE id = ?').get(testUser.id);
      expect(bcrypt.compareSync(newPassword, dbUser.password_hash)).toBe(true);
      expect(bcrypt.compareSync('password123', dbUser.password_hash)).toBe(false); // Old password fails
    });

    it('should return false for non-existent user', () => {
      const success = User.changePassword(9999, 'new_password');
      expect(success).toBe(false);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', () => {
      const dbUser = db.prepare('SELECT * FROM users WHERE id = ?').get(testUser.id);
      const isCorrect = User.verifyPassword('password123', dbUser.password_hash);
      expect(isCorrect).toBe(true);
    });

    it('should return false for incorrect password', () => {
      const dbUser = db.prepare('SELECT * FROM users WHERE id = ?').get(testUser.id);
      const isCorrect = User.verifyPassword('wrongpassword', dbUser.password_hash);
      expect(isCorrect).toBe(false);
    });
  });

  describe('deactivate', () => {
    it('should set is_active to 0', () => {
      const success = User.deactivate(testUser.id);
      expect(success).toBe(true);

      const user = User.findById(testUser.id);
      expect(user.is_active).toBe(0);
    });

    it('should return false for non-existent user', () => {
      const success = User.deactivate(9999);
      expect(success).toBe(false);
    });
  });
});
