import styles from './app.module.css';

export function App() {
  return (
    <div className={styles['container']}>
      <header className={styles['header']}>
        <h1>Webrana Cloud - Customer Portal</h1>
        <p>Welcome to the Customer Portal</p>
      </header>
      <main className={styles['main']}>
        <div className={styles['placeholder']}>
          <h2>Customer Dashboard</h2>
          <p>This is a placeholder page for the customer-facing web application.</p>
          <ul>
            <li>Manage your cloud instances</li>
            <li>View billing and usage</li>
            <li>Access service catalog</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default App;
