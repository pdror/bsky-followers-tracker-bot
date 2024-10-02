import { db } from './db.js';

export const checkIfFirstTime = (handle) => {
    console.log(`Checking if ${handle} is a new user`);
    return new Promise((resolve, reject) => {
        const query = `SELECT COUNT(*) as count FROM users WHERE handle = ?;`;

        db.get(query, [handle], (err, row) => {
            if(err) {
                console.error(err);
                return reject(err);
            }

            resolve(row.count === 0);
        });
    });
};

export const saveUser = (did, handle) => {
    return new Promise((resolve, reject) => {
        const insertQuery = `INSERT INTO users (did, handle, last_checked) VALUES (?, ?, DATETIME('now'))`;

        db.run(insertQuery, [did, handle], (err) => {
            if(err) {
                return reject(err);
            }
            resolve();
        });
    });
};