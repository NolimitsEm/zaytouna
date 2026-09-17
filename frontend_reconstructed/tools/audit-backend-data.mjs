// Read-only local database audit. Never print account names, emails or secrets.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import dotenv from '../../backend/node_modules/dotenv/lib/main.js';
import mysql from '../../backend/node_modules/mysql2/promise.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
dotenv.config({path:path.resolve(root,'../backend/.env'),quiet:true});
const host=process.env.MYSQL_HOST||'127.0.0.1';
if(!['127.0.0.1','localhost','::1'].includes(host))throw new Error('Audit is restricted to the configured local database.');
const report={checkedAt:new Date().toISOString(),readOnly:true};let connection;
try{
 connection=await mysql.createConnection({host,port:Number(process.env.MYSQL_PORT||3306),user:process.env.MYSQL_USER||'root',password:process.env.MYSQL_PASSWORD||'',database:process.env.MYSQL_DATABASE||'zaytouna_platform',connectTimeout:4000});
 await connection.query('START TRANSACTION READ ONLY');
 const [tables]=await connection.query('SHOW TABLES');report.tables=tables.map(row=>Object.values(row)[0]);
 const load=async table=>{const [rows]=await connection.query(`SELECT payload FROM \`${table}\``);return rows.map(row=>typeof row.payload==='string'?JSON.parse(row.payload):row.payload).filter(Boolean);};
 const users=report.tables.includes('users')?await load('users'):[];
 const levels=report.tables.includes('niveaux')?await load('niveaux'):[];
 const groups=report.tables.includes('groupes')?await load('groupes'):[];
 const id=value=>String(value??'').trim();const levelIds=new Set(levels.map(x=>id(x.id))),groupIds=new Set(groups.map(x=>id(x.id)));
 const students=users.filter(user=>user.role==='student');
 report.users=users.length;report.students=students.length;report.levels=levels.length;report.groups=groups.length;
 report.disabledUsers=users.filter(user=>user.isDisabled).length;
 report.disabledConfirmedUsers=users.filter(user=>user.isDisabled&&user.emailConfirmed).length;
 report.disabledByFailedLogin=users.filter(user=>user.isDisabled&&user.disabledReason==='too_many_failed_login_attempts').length;
 report.unconfirmedUsers=users.filter(user=>!user.emailConfirmed).length;
 report.activeStudents=students.filter(user=>!user.isDisabled&&user.emailConfirmed).length;
 report.studentsWithoutMatchingLevel=students.filter(user=>!levelIds.has(id(user.niveauId))).length;
 report.studentsWithoutMatchingGroup=students.filter(user=>!groupIds.has(id(user.groupeId))).length;
 report.studentsWithNumericCohortIds=students.filter(user=>typeof user.niveauId==='number'||typeof user.groupeId==='number').length;
 report.nonBooleanAccountFlags=users.filter(user=>typeof user.isDisabled!=='boolean'||typeof user.emailConfirmed!=='boolean').length;
 report.connected=true;await connection.rollback();
}catch(error){report.connected=false;report.errorCode=error.code||error.name;}
finally{if(connection)await connection.end();}
fs.writeFileSync(path.join(root,'forensics/validation/backend-data-audit.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
