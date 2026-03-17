function SearchPanel({
  searchValue,
  totalCount,
  isLoggedIn,
  busyAction,
  onSearchChange,
  onAdd,
  onRefresh,
}) {
  return (
    <section className="panel search-panel">
      <div className="section-heading">
        <div>
          <p className="section-heading__eyebrow">Monitor Setup</p>
          <h2>Deploy a New Course Sniper</h2>
        </div>
        <div className="stats-pill">
          <span>{isLoggedIn ? `Tasks ${totalCount}` : 'Login required'}</span>
        </div>
      </div>

      <div className="search-row">
        <label className="field field--grow">
          <span>Course or section</span>
          <input
            type="text"
            value={searchValue}
            onChange={onSearchChange}
            placeholder="COMP SCI 577 or 76101"
          />
        </label>
        <button
          type="button"
          className="btn btn--accent"
          onClick={onAdd}
          disabled={busyAction === 'add'}
        >
          {busyAction === 'add' ? 'Searching...' : 'Snipe'}
        </button>
        <button
          type="button"
          className="btn btn--soft"
          onClick={onRefresh}
          disabled={!isLoggedIn || busyAction === 'load'}
        >
          {busyAction === 'load' ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </section>
  )
}

export default SearchPanel
