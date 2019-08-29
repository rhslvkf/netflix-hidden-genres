import { Injectable, EventEmitter } from '@angular/core';

import { SQLite, SQLiteObject } from '@ionic-native/sqlite/ngx';

import { CREATE_TABLE_QUERY, INSERT_INIT_QUERY } from './query';

@Injectable({
  providedIn: 'root'
})
export class SqlStorageService {
  storage: any;
  DB_NAME: string = 'netflix-hidden-category.db';
  setDatabaseState: EventEmitter<any> = new EventEmitter<any>();

  constructor(public sqlite: SQLite) {
    this.sqlite.create({
      name: this.DB_NAME, location: 'default'
    }).then((db: SQLiteObject) => {
      this.storage = db;
      this.tryInit();
    });
  }

  tryInit() {
    this.query(CREATE_TABLE_QUERY)
    .then(() => {
      this.query(INSERT_INIT_QUERY)
      .then(() => {
        this.setDatabaseState.emit();
      })
      .catch(err => {
        console.error('Unable to insert initial data', err.tx, err.err);
      });
    })
    .catch(err => {
        console.error('Unable to create initial storage tables', err.tx, err.err);
    });
  }

  /**
   * Perform an arbitrary SQL operation on the database. Use this method
   * to have full control over the underlying database through SQL operations
   * like SELECT, INSERT, and UPDATE.
   *
   * @param {string} query the query to run
   * @param {array} params the additional params to use for query placeholders
   * @return {Promise} that resolves or rejects with an object of the form 
   * { tx: Transaction, res: Result (or err)}
   */
  query(query: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
        try {
            this.storage.transaction((tx: any) => {
                    tx.executeSql(query, params,
                        (tx: any, res: any) => resolve({ tx: tx, res: res }),
                        (tx: any, err: any) => reject({ tx: tx, err: err }));
                },
                (err: any) => reject({ err: err }));
        } catch (err) {
            reject({ err: err });
        }
    });
  }

  /** GET the value in the database identified by the given key. */
  get(key: string): Promise<any> {
    return this.query('select key, value from kv where key = ? limit 1', [key])
    .then(data => {
        if (data.res.rows.length > 0) {
            return data.res.rows.item(0).value;
        }
    });
  }

  /** SET the value in the database for the given key. */
  set(key: string, value: string): Promise<any> {
      return this.query('insert into kv(key, value) values (?, ?)', [key, value]);
  }

  /** REMOVE the value in the database for the given key. */
  remove(key: string): Promise<any> {
      return this.query('delete from kv where key = ?', [key]);
  }
}
