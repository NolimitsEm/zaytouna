import test from 'node:test';
import assert from 'node:assert/strict';
import {state} from '../src/context/state.js';
import {studentMatchesCohort,selectedScheduleStudents,renderScheduleStudents} from '../src/pages/schedule.js';
test('schedule cohort matching normalizes numeric/string IDs and supports all groups within a level',()=>{
 assert.equal(studentMatchesCohort({niveauId:2,groupeId:7},'2','7'),true);
 assert.equal(studentMatchesCohort({niveauId:' n1 ',groupeId:' ga '},'n1','ga'),true);
 assert.equal(studentMatchesCohort({niveauId:'n1',groupeId:'ga'},'n1',''),true);
 assert.equal(studentMatchesCohort({niveauId:'n2',groupeId:'ga'},'n1',''),false);
 assert.equal(studentMatchesCohort({niveauId:'n1',groupeId:'gb'},'n1','ga'),false);
 assert.equal(studentMatchesCohort({niveauId:'n1',groupeId:'ga'},'',''),false);
});
test('numeric student selections survive serialization and edit-form ownership',()=>{
 state.users=[{id:42,role:'student',name:'أَحْمَد',niveauId:2,groupeId:7,isDisabled:false}];state.levels=[{id:2,name:'قسم'}];state.groups=[{id:7,name:'فوج'}];
 const data=new FormData();data.append('studentIds','42');
 assert.deepEqual(selectedScheduleStudents(data,'2','7'),['42']);
 const html=renderScheduleStudents(['42'],'2','7','edit-1');assert.match(html,/form="edit-1"/);assert.match(html,/checked/);assert.match(html,/data-student-name="احمد"/);
});
