import {Client} from '@notionhq/client';
const c = new Client({auth: 'fake', notionVersion: '2025-09-03'});
console.log('databases properties:', Object.keys(c.databases));
console.log('databases.query type:', typeof c.databases.query);
console.log('databases.query callable?:', typeof c.databases.query === 'function');
console.log('\ndataSources exists?:', !!c.dataSources);
if (c.dataSources) {
  console.log('dataSources properties:', Object.keys(c.dataSources));
}
