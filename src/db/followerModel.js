import { db } from './db.js';

export const saveFollowers = (author_did, followers) => {
    return new Promise((resolve, reject) => {
        const insertQuery = `INSERT INTO followers (did, user_did, follower_handle, is_active) VALUES (?, ?, ?, 1)`;

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            followers.forEach(follower => {
                db.run(insertQuery, [follower.did, author_did, follower.handle]);
            });

            db.run("COMMIT", (err) => {
                if(err) {
                    return reject(err);
                }
                resolve();
            });
        });
    });
};