import StatusBadge from './StatusBadge'

function TaskTable({ tasks, isLoggedIn, statusMessage, onToggle, onDelete }) {
  if (!isLoggedIn) {
    return (
      <section className="panel">
        <div className="empty-state">
          <h3>Login required</h3>
          <p>{statusMessage}</p>
        </div>
      </section>
    )
  }

  if (tasks.length === 0) {
    return (
      <section className="panel">
        <div className="empty-state">
          <h3>No active monitors</h3>
          <p>{statusMessage}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="panel">
      <div className="table-header">
        <div>
          <p className="section-heading__eyebrow">Tracked Tasks</p>
          <h2>Course Watchlist</h2>
        </div>
        <p className="helper-text">{statusMessage}</p>
      </div>

      <div className="table-wrap">
        <table className="task-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Section ID</th>
              <th>Status</th>
              <th>Monitor</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>
                  <strong>{task.courseDisplayName}</strong>
                </td>
                <td>{task.sectionId}</td>
                <td>
                  <StatusBadge status={task.status} />
                </td>
                <td>
                  <label className="toggle" aria-label={`Toggle ${task.courseDisplayName}`}>
                    <input
                      type="checkbox"
                      checked={task.enabled}
                      onChange={() => onToggle(task.id)}
                    />
                    <span className="toggle__track">
                      <span className="toggle__thumb" />
                    </span>
                  </label>
                </td>
                <td>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => onDelete(task.courseDisplayName)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default TaskTable
