import sqlite3 from 'sqlite3';

export const db = new sqlite3.Database('../bsky.db');

export const initDB = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, did TEXT NOT NULL UNIQUE, handle TEXT NOT NULL, last_checked DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`
            , (err) => {
                if(err) {
                    return reject(err);
                }
                console.log('Users table created');
            });

            db.run(`CREATE TABLE IF NOT EXISTS followers(id INTEGER PRIMARY KEY AUTOINCREMENT, did TEXT NOT NULL, user_did TEXT NOT NULL, follower_handle TEXT NOT NULL, is_active BOOLEAN DEFAULT 1, unfollowed_at DATETIME, FOREIGN KEY (user_did) REFERENCES users(did));`
            , (err) => {
                if(err) {
                    return reject(err);
                }
                console.log('Followers table created');
                resolve();
            });
        });
    });
};