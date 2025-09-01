export default function UserManagement() {
  return (
    <div className="internal-page">
      <div className="internal-page__header">
        <h1>User Management</h1>
        <p className="text-muted">Manage user accounts, permissions, and access control</p>
      </div>

      <div className="internal-toolbar">
        <div className="internal-toolbar__group">
          <button className="internal-btn internal-btn--primary">Add User</button>
          <button className="internal-btn internal-btn--outline">Invite Members</button>
          <button className="internal-btn internal-btn--outline">Export List</button>
        </div>
        <div className="internal-toolbar__group">
          <input type="search" className="internal-input" placeholder="Search users..." />
          <select className="internal-select">
            <option>All Roles</option>
            <option>Admin</option>
            <option>Project Manager</option>
            <option>Member</option>
            <option>Volunteer</option>
          </select>
        </div>
      </div>

      <div className="internal-users-view">
        <div className="internal-users-stats">
          <div className="internal-stat-card">
            <div className="internal-stat-card__number">1,247</div>
            <div className="internal-stat-card__label">Total Users</div>
            <div className="internal-stat-card__change internal-stat-card__change--positive">+89 this month</div>
          </div>
          <div className="internal-stat-card">
            <div className="internal-stat-card__number">342</div>
            <div className="internal-stat-card__label">Active Members</div>
            <div className="internal-stat-card__change internal-stat-card__change--positive">+12 this week</div>
          </div>
          <div className="internal-stat-card">
            <div className="internal-stat-card__number">45</div>
            <div className="internal-stat-card__label">Project Leads</div>
            <div className="internal-stat-card__change internal-stat-card__change--neutral">No change</div>
          </div>
          <div className="internal-stat-card">
            <div className="internal-stat-card__number">8</div>
            <div className="internal-stat-card__label">Administrators</div>
            <div className="internal-stat-card__change internal-stat-card__change--neutral">No change</div>
          </div>
        </div>

        <div className="internal-users-table-container">
          <table className="internal-users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Location</th>
                <th>Last Active</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="internal-user-cell">
                    <div className="internal-user-avatar">SC</div>
                    <div className="internal-user-info">
                      <div className="internal-user-name">Sarah Chen</div>
                      <div className="internal-user-id">#1247</div>
                    </div>
                  </div>
                </td>
                <td>sarah.chen@example.com</td>
                <td>
                  <span className="internal-badge internal-badge--primary">Admin</span>
                </td>
                <td>Brisbane, QLD</td>
                <td>2 hours ago</td>
                <td>
                  <span className="internal-status internal-status--active">Active</span>
                </td>
                <td>
                  <div className="internal-actions">
                    <button className="internal-btn internal-btn--sm internal-btn--outline">Edit</button>
                    <button className="internal-btn internal-btn--sm internal-btn--ghost">Suspend</button>
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="internal-user-cell">
                    <div className="internal-user-avatar">MT</div>
                    <div className="internal-user-info">
                      <div className="internal-user-name">Michael Torres</div>
                      <div className="internal-user-id">#1246</div>
                    </div>
                  </div>
                </td>
                <td>m.torres@example.com</td>
                <td>
                  <span className="internal-badge internal-badge--success">Project Manager</span>
                </td>
                <td>Sydney, NSW</td>
                <td>1 day ago</td>
                <td>
                  <span className="internal-status internal-status--active">Active</span>
                </td>
                <td>
                  <div className="internal-actions">
                    <button className="internal-btn internal-btn--sm internal-btn--outline">Edit</button>
                    <button className="internal-btn internal-btn--sm internal-btn--ghost">Suspend</button>
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="internal-user-cell">
                    <div className="internal-user-avatar">JW</div>
                    <div className="internal-user-info">
                      <div className="internal-user-name">Jessica Williams</div>
                      <div className="internal-user-id">#1245</div>
                    </div>
                  </div>
                </td>
                <td>jessica.w@example.com</td>
                <td>
                  <span className="internal-badge internal-badge--info">Member</span>
                </td>
                <td>Melbourne, VIC</td>
                <td>3 days ago</td>
                <td>
                  <span className="internal-status internal-status--pending">Pending</span>
                </td>
                <td>
                  <div className="internal-actions">
                    <button className="internal-btn internal-btn--sm internal-btn--outline">Edit</button>
                    <button className="internal-btn internal-btn--sm internal-btn--primary">Approve</button>
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="internal-user-cell">
                    <div className="internal-user-avatar">DP</div>
                    <div className="internal-user-info">
                      <div className="internal-user-name">David Parker</div>
                      <div className="internal-user-id">#1244</div>
                    </div>
                  </div>
                </td>
                <td>david.parker@example.com</td>
                <td>
                  <span className="internal-badge internal-badge--warning">Volunteer</span>
                </td>
                <td>Perth, WA</td>
                <td>1 week ago</td>
                <td>
                  <span className="internal-status internal-status--inactive">Inactive</span>
                </td>
                <td>
                  <div className="internal-actions">
                    <button className="internal-btn internal-btn--sm internal-btn--outline">Edit</button>
                    <button className="internal-btn internal-btn--sm internal-btn--ghost">Reactivate</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="internal-pagination">
          <button className="internal-btn internal-btn--outline" disabled>Previous</button>
          <div className="internal-pagination__info">
            Showing 1-4 of 1,247 users
          </div>
          <button className="internal-btn internal-btn--outline">Next</button>
        </div>
      </div>
    </div>
  )
}