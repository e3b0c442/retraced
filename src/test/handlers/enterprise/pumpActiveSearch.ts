import { suite, test } from "mocha-typescript";
import pumpActiveSearch from "../../../handlers/enterprise/pumpActiveSearch";
import getPgPool from "../../../persistence/pg";
import { defaultEventCreater } from "../../../handlers/createEvent";
import { expect } from "chai";
import { AdminTokenStore } from "../../../models/admin_token/store";
import create from "../../../models/api_token/create";

@suite class PumpActiveSearch {
    @test public async "PumpActiveSearch#pumpActiveSearch()"() {
        let pool = getPgPool();
        try {
            await cleanup(pool);
            await setup(pool, {});
            let res = await pumpActiveSearch({
                get: () => {
                    return `token=test`;
                },
                params: {
                    activeSearchId: "test",
                },
                query: {
                    page_size: 10,
                    next: 0,
                },
                body: {},
            });
            expect(res).to.not.be.undefined;
            expect(res.body).to.not.be.undefined;
            expect(res.status).to.equal(200);
        } catch (ex) {
            console.log(ex);
        } finally {
            await cleanup(pool);
        }
    }
    @test public async "PumpActiveSearch#pumpActiveSearch() with events"() {
        let pool = getPgPool();
        try {
            await cleanup(pool);
            await setup(pool, {
                seedEvents: true,
            });
            let res = await pumpActiveSearch({
                get: () => {
                    return `token=test`;
                },
                params: {
                    activeSearchId: "test",
                },
                query: {
                    page_size: 10,
                    next: 0,
                },
                body: {},
            });
            expect(res).to.not.be.undefined;
            expect(res.body).to.not.be.undefined;
            expect(res.status).to.equal(200);
        } catch (ex) {
            console.log(ex);
        } finally {
            await cleanup(pool);
        }
    }
    @test public async "PumpActiveSearch#pumpActiveSearch() throws Missing required 'id' parameter"() {
        let pool = getPgPool();
        try {
            await cleanup(pool);
            await setup(pool, {});
            await pumpActiveSearch({
                get: () => {
                    return `token=test`;
                },
                params: {
                    activeSearchId: "",
                },
                query: {
                    page_size: 10,
                    next: 1,
                },
                body: {},
            });
            throw new Error(`Expected error "Missing required 'id' parameter" to be thrown`);
        } catch (ex) {
            expect(ex.status).to.equal(400);
            expect(ex.err.message).to.equal("Missing required 'id' parameter");
        } finally {
            await cleanup(pool);
        }
    }
    @test public async "PumpActiveSearch#pumpActiveSearch() throws Active search not found"() {
        let pool = getPgPool();
        let activeSearchId = "wdcedc";
        try {
            await cleanup(pool);
            await setup(pool, {
                skipActiveSearch: true,
            });
            let res = await pumpActiveSearch({
                get: () => {
                    return `token=test`;
                },
                params: {
                    activeSearchId,
                },
                query: {
                    page_size: 10,
                    next: 1,
                },
                body: {},
            });
            console.log(res);
            throw new Error(`Expected error "Active search not found (id=${activeSearchId})" to be thrown`);
        } catch (ex) {
            expect(ex.status).to.equal(404);
            expect(ex.err.message).to.equal(`Active search not found (id=${activeSearchId})`);
        } finally {
            await cleanup(pool);
        }
    }
    @test public async "PumpActiveSearch#pumpActiveSearch() throws Unknown query descriptor version"() {
        let pool = getPgPool();
        let version = 2;
        let activeSearchId = "test";
        try {
            await cleanup(pool);
            await setup(pool, {
                version,
            });
            let res = await pumpActiveSearch({
                get: () => {
                    return `token=test`;
                },
                params: {
                    activeSearchId,
                },
                query: {
                    page_size: 10,
                    next: 1,
                },
                body: {},
            });
            console.log(res);
            throw new Error(`Expected error "Unknown query descriptor version: ${version}" to be thrown`);
        } catch (ex) {
            console.log(ex);
            expect(ex.message).to.equal(`Unknown query descriptor version: ${version}`);
        } finally {
            await cleanup(pool);
        }
    }
    @test public async "PumpActiveSearch#pumpActiveSearch() throws if active and saved search not found"() {
        let pool = getPgPool();
        let activeSearchId = "test";
        let savedSearchId = "dfs";
        try {
            await cleanup(pool);
            await setup(pool, {
                skipSavedSearch: true,
                invalidSearchId: savedSearchId,
                deleteSavedSearch: true,
            });
            let res = await pumpActiveSearch({
                get: () => {
                    return `token=test`;
                },
                params: {
                    activeSearchId,
                },
                query: {
                    page_size: 10,
                    next: 1,
                },
                body: {},
            });
            console.log("res=>", res);
            throw new Error(`Expected error "Active search (id=${activeSearchId}) refers to a non-existent saved search (id=${savedSearchId})" to be thrown`);
        } catch (ex) {
            console.log(ex);
            expect(ex.status).to.equal(404);
            expect(ex.err.message).to.equal(`Active search (id=${activeSearchId}) refers to a non-existent saved search (id=${savedSearchId})`);
        } finally {
            await cleanup(pool);
        }
    }
}
async function setup(pool, params?) {
    await pool.query("INSERT INTO project (id, name) VALUES ($1, $2)", ["test", "test"]);
    await pool.query("INSERT INTO environment (id, name, project_id) VALUES ($1, $2, $3)", ["test", "test", "test"]);
    await pool.query("INSERT INTO retraceduser (id, email) VALUES ($1, $2)", ["test", "test@test.com"]);
    await pool.query("INSERT INTO environmentuser (user_id, environment_id, email_token) VALUES ($1, $2, $3)", ["test", "test", "dummytoken"]);
    await pool.query("INSERT INTO projectuser (id, project_id, user_id) VALUES ($1, $2, $3)", ["test", "test", "test"]);
    await pool.query("INSERT INTO invite (id, created, email, project_id) VALUES ($1, $2, $3, $4)", ["test", new Date(), "test@test.com", "test"]);
    if (!params.skipSavedSearch) {
        await pool.query("INSERT INTO saved_search (id, name, project_id, environment_id, group_id, query_desc) VALUES ($1, $2, $3, $4, $5, $6)", [params.invalidSearchId || "test", "test", "test", "test", "test", JSON.stringify(
            {
                version: params.version || 1,
                showCreate: true,
                showRead: false,
                showUpdate: false,
                showDelete: false,
                // searchQuery?: string,
                // startTime?: number,
                // endTime?: number,
                // actions?: string[],
                // actorIds?: string[],
            },
        )]);
    }
    if (params.seedEvents) {
        defaultEventCreater.createEvent("token=test", "test", {
            action: "action1",
            crud: "c",
            group: {
                id: "string",
                name: "group1",
            },
            displayTitle: "string",
            created: new Date(),
            actor: {
                id: "string",
                name: "actor1",
                href: "string",
            },
            target: {
                id: "string",
                name: "target1",
                href: "target2",
                type: "target1",
            },
            source_ip: "127.0.0.1",
            description: "descc",
            is_anonymous: true,
            is_failure: true,
            fields: {},
            component: "comp1",
            version: "v1",
        });
    }
    if (!params.skipActiveSearch) {
        await pool.query("INSERT INTO active_search (id, project_id, environment_id, group_id, saved_search_id ) values ($1, $2, $3, $4, $5)", ["test", "test", "test", "test", params.invalidSearchId || "test"]);
    }
    if (params.deleteSavedSearch) {
        await pool.query(`DELETE FROM saved_search WHERE project_id=$1`, ["test"]);
    }
    let res = await AdminTokenStore.default().createAdminToken("test");
    await create("test", "test", {
        name: "test",
        disabled: false,
    }, undefined, "test");
    await pool.query("INSERT INTO eitapi_token (id, display_name, project_id, environment_id, group_id, view_log_action) VALUES ($1, $2, $3, $4, $5, $6)", ["test", "test", "test", "test", "test", "test"]);
    return res;
}

async function cleanup(pool) {
    await pool.query(`DELETE FROM admin_token WHERE user_id=$1`, ["test"]);
    await pool.query(`DELETE FROM environmentuser WHERE user_id=$1`, ["test"]);
    await pool.query(`DELETE FROM environment WHERE name=$1`, ["test"]);
    await pool.query(`DELETE FROM project WHERE name=$1 OR name=$2`, ["test", "test1"]);
    await pool.query(`DELETE FROM projectuser WHERE project_id=$1`, ["test"]);
    await pool.query(`DELETE FROM token WHERE environment_id=$1`, ["test"]);
    await pool.query(`DELETE FROM retraceduser WHERE email=$1`, ["test@test.com"]);
    await pool.query(`DELETE FROM eitapi_token WHERE environment_id=$1`, ["test"]);
    await pool.query(`DELETE FROM invite WHERE project_id=$1`, ["test"]);
    await pool.query(`DELETE FROM active_search WHERE project_id=$1`, ["test"]);
    await pool.query(`DELETE FROM saved_search WHERE project_id=$1`, ["test"]);
}
