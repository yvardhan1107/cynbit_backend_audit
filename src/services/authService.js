const { signToken } = require('../middleware/auth');

// Seed test users for demo/testing
const USERS = [
  {
    id: 'usr_admin_1',
    email: 'admin@cynbit.in',
    password: 'SecureAdminPass2026!',
    name: 'Admin User',
    role: 'admin',
    tenantId: 'cynbit_corp',
  },
  {
    id: 'usr_staff_1',
    email: 'admissions@bitelevate.in',
    password: 'StaffSecretPass2026!',
    name: 'Admissions Staff',
    role: 'staff',
    tenantId: 'bitelevate_edu',
  },
  {
    id: 'usr_client_1',
    email: 'client@tenantease.in',
    password: 'ClientSecretPass2026!',
    name: 'Enterprise Client',
    role: 'client',
    tenantId: 'tenant_enterprise_42',
  },
];

class AuthService {
  async login(email, password) {
    const user = USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user || user.password !== password) {
      return null;
    }

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    };

    const token = signToken(tokenPayload);

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }
}

const authService = new AuthService();

module.exports = authService;
