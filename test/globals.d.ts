/**
 * @Update 2022 - This has logic has been update to support newer Node.js versions
 * that don't have NodeJS as a global type
 */
declare global {
    var testRequest: import('SuperTest').SuperTest<import('supertest').Test>
}

export {};