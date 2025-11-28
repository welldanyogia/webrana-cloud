import styles from './app.module.css';

export function App() {
  return (
    <div className={styles['container']}>
      <header className={styles['header']}>
        <h1>Webrana Cloud - Admin Portal</h1>
        <p>Welcome to the Admin Portal</p>
      </header>
      <main className={styles['main']}>
        <div className={styles['placeholder']}>
          <h2>Admin Dashboard</h2>
          <p>This is a placeholder page for the admin web application.</p>
          <ul>
            <li>Manage users and providers</li>
            <li>Monitor all instances</li>
            <li>Configure services and billing</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default App;
