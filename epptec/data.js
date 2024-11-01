import mysql from 'mysql2/promise';

const clientConfig = {
    user: '',
    host: '',
    password: '',
    port: 3306,
};

//Nastavení připojení k databázi
const dbName = 'your_database';

const createDatabaseAndTables = async () => {
    try {
        const connection = await mysql.createConnection(clientConfig);
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName};`);
        await connection.end();

        const db = await mysql.createConnection({ ...clientConfig, database: dbName });
        await createTables(db);
        await insertSampleData(db);
        await showTables(db);
        await db.end();
    } catch (err) {
        console.error('Error creating database and tables:', err);
    }
};

const createTables = async (db) => {
  //Smazání existujících tabulek, abych mohl opakovaně spoštět kód na stejné database
    await db.query("DROP TABLE IF EXISTS Transakce;");
    await db.query("DROP TABLE IF EXISTS Balance;");
    await db.query("DROP TABLE IF EXISTS Ucet;");
    await db.query("DROP TABLE IF EXISTS Klient;");


//Vytvořené tabulky Klient, Ucet, Transakce, a Balance
    const tableQueries = [
        `CREATE TABLE IF NOT EXISTS Klient (
            klient_id INT AUTO_INCREMENT PRIMARY KEY,
            jmeno VARCHAR(50) NOT NULL,
            prijmeni VARCHAR(50) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL
        );`,
        `CREATE TABLE IF NOT EXISTS Ucet (
            ucet_id INT AUTO_INCREMENT PRIMARY KEY,
            klient_id INT,
            ucet_typ VARCHAR(50) NOT NULL,
            FOREIGN KEY (klient_id) REFERENCES Klient(klient_id) ON DELETE CASCADE
        );`,
        `CREATE TABLE IF NOT EXISTS Transakce (
            transakce_id INT AUTO_INCREMENT PRIMARY KEY,
            ucet_id INT,
            amount DECIMAL(10, 2) NOT NULL,
            typ_transakce VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ucet_id) REFERENCES Ucet(ucet_id) ON DELETE CASCADE
        );`,
        `CREATE TABLE IF NOT EXISTS Balance (
            balance_id INT AUTO_INCREMENT PRIMARY KEY,
            ucet_id INT,
            jistina DECIMAL(10, 2) NOT NULL,
            urok DECIMAL(10, 2) NOT NULL,
            poplatky DECIMAL(10, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ucet_id) REFERENCES Ucet(ucet_id) ON DELETE CASCADE
        );`,
    ];

    for (const query of tableQueries) {
        await db.query(query);
    }
    console.log('Tables created successfully.');
};

const insertSampleData = async (db) => {
    try {
      // data jsem zde při spuštění mazal, abych mohl několikrát po sobě spustit kód a nemusel použít insert ignore
        await db.query("DELETE FROM Balance;");
        await db.query("DELETE FROM Transakce;");
        await db.query("DELETE FROM Ucet;");
        await db.query("DELETE FROM Klient;");

       //insertování dat
        const [resultInsertKlient] = await db.query(`
            INSERT INTO Klient (jmeno, prijmeni, email) VALUES
            ('John', 'Doe', 'john.doe@example.com'),
            ('Jane', 'Smith', 'jane.smith@example.com');
        `);
        console.log(`${resultInsertKlient.affectedRows} clients inserted.`);

        const [clients] = await db.query("SELECT klient_id, jmeno FROM Klient;");
        const johnId = clients.find(client => client.jmeno === 'John').klient_id;
        const janeId = clients.find(client => client.jmeno === 'Jane').klient_id;

        await db.query(`
            INSERT INTO Ucet (klient_id, ucet_typ) VALUES 
            (${johnId}, 'Checking'), 
            (${johnId}, 'Savings'), 
            (${janeId}, 'Checking'), 
            (${janeId}, 'Savings');
        `);
        console.log('Accounts inserted successfully.');

        const [accounts] = await db.query("SELECT ucet_id FROM Ucet;");
        const firstAccountId = accounts[0].ucet_id;
        const secondAccountId = accounts[3].ucet_id;

        await db.query(`
            INSERT INTO Balance (ucet_id, jistina, urok, poplatky) VALUES 
            (${firstAccountId}, 1000.00, 0.15, 2.5), 
            (${secondAccountId}, 2200.00, 0.5, 1.0);
        `);
        console.log('Balances inserted successfully.');

        await db.query(`
            INSERT INTO Transakce (ucet_id, amount, typ_transakce) VALUES 
            (${firstAccountId}, 200, 'Deposit'), 
            (${secondAccountId}, -100, 'Withdrawal');
        `);
        console.log('Transactions inserted successfully.');

        console.log('Sample data inserted successfully.');
    } catch (err) {
        console.error('Error inserting sample data:', err);
    }
};


// Ujištění pro mě, že jsem jsem úspěšně vytvořil a naplnil tabulky
const showTables = async (db) => {
    try {
        const [tables] = await db.query("SHOW TABLES;");
        console.log("Tables in the database:");
        for (const table of tables) {
            const tableName = Object.values(table)[0];
            const [tableData] = await db.query(`SELECT * FROM ${tableName};`);
            console.log(`Data in table "${tableName}":`, tableData);
        }
    } catch (err) {
        console.error('Error fetching table structures and data:', err);
    }
};

// 10 klientů s maximální celkovou pohledávkou - jistina * (1 + urok) + poplatky. (počítám s tím, že úrok bude pouze v desetinných číslech)
const getTopClientsByTotalDebt = async (db) => {
  try {
      const [clients] = await db.query(`
          SELECT 
              Klient.klient_id, 
              Klient.jmeno, 
              Klient.prijmeni, 
              IFNULL(SUM(Balance.jistina * (1 + Balance.urok) + Balance.poplatky), 0) AS celkova_pohledavka,
              DATE_ADD(MAX(Transakce.created_at), INTERVAL 1 MONTH) AS datum_splatnosti  -- Last transaction date plus one month
          FROM 
              Klient
          LEFT JOIN 
              Ucet ON Klient.klient_id = Ucet.klient_id
          LEFT JOIN 
              Balance ON Ucet.ucet_id = Balance.ucet_id
          LEFT JOIN 
              Transakce ON Ucet.ucet_id = Transakce.ucet_id  -- Join to include transactions
          GROUP BY 
              Klient.klient_id, Klient.jmeno, Klient.prijmeni
          ORDER BY 
              celkova_pohledavka DESC
          LIMIT 10;  
      `);
      console.log("Top 10 clients by total receivables:");
      console.table(clients);
  } catch (err) {
      console.error('Error fetching top clients by total receivables:', err);
  }
};



// kliemnti s listinami darzsimi nez 1000(c).
const getClientsWithBalanceAboveC = async (db, c) => {
    try {
        const [clients] = await db.query(`
            SELECT 
                Klient.klient_id AS id_klient, 
                Klient.jmeno, 
                Klient.prijmeni
            FROM 
                Klient
            JOIN 
                Ucet ON Klient.klient_id = Ucet.klient_id
            JOIN 
                Balance ON Ucet.ucet_id = Balance.ucet_id
            GROUP BY 
                Klient.klient_id
            HAVING 
                SUM(Balance.jistina) > ?`, [c]);
        console.table(clients);
    } catch (err) {
        console.error('Error fetching clients:', err);
    }
};

const main = async () => {
    await createDatabaseAndTables();
  
    const db = await mysql.createConnection({ ...clientConfig, database: dbName });
    const c = 1000; 

    await getClientsWithBalanceAboveC(db, c);
    await getTopClientsByTotalDebt(db);
    
    await db.end();
};

main().catch(err => console.error(err));
