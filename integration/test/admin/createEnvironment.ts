import { expect } from "chai";
import * as Retraced from "@retraced-hq/retraced";
import { retracedUp } from "../pkg/retracedUp";
import adminUser from "../pkg/adminUser";
import * as Env from "../env";
import { sleep } from "../pkg/util";

// tslint:disable-next-line
const chai = require("chai"),
  chaiHttp = require("chai-http");
chai.use(chaiHttp);

describe("Admin create environment", function () {
  if (!Env.AdminRootToken) {
    return;
  }
  const headless = new Retraced.Client({
    apiKey: Env.HeadlessApiKey,
    projectId: Env.HeadlessProjectID,
    endpoint: Env.Endpoint,
  });
  let project;
  let env;
  let jwt;
  let adminId;

  context("Given the Retraced API is up and running", function () {
    before(retracedUp(Env));

    context("And an admin user is logged in", function () {
      before(async function () {
        const admin: any = await adminUser(Env);
        jwt = admin.jwt;
        project = admin.project;
        env = admin.project.environments[0];
        adminId = admin.userId;
      });

      context("When a new environment is created", function () {
        const envName = "QA";
        let resp;

        before(function (done) {
          chai
            .request(Env.Endpoint)
            .post(`/admin/v1/project/${project.id}/environment`)
            .set("Authorization", jwt)
            .send({ name: envName })
            .end((err, res) => {
              expect(err).to.be.null;
              resp = res;
              done();
            });
        });

        specify("The environment is returned with status 201.", function () {
          expect(resp.status).to.equal(201);
          expect(resp.body.id).to.be.ok;
          expect(resp.body).to.have.property("name", envName);
          expect(resp.body).to.have.property("project_id", project.id);
        });

        specify(
          "The creation is audited under the headless project.",
          async function () {
            this.timeout(Env.EsIndexWaitMs * 2);
            await sleep(Env.EsIndexWaitMs);
            const query = {
              crud: "c",
              action: "environment.create",
            };
            const mask = {
              action: true,
              crud: true,
              actor: {
                id: true,
              },
              target: {
                id: true,
                name: true,
              },
              group: {
                id: true,
              },
            };
            const connection = await headless.query(query, mask, 1);
            const audited = connection.currentResults[0];
            const token = resp.body;

            expect(audited.action).to.equal("environment.create");
            expect(audited.crud).to.equal("c");
            expect(audited.group!.id).to.equal(project.id);
            expect(audited.actor!.id).to.equal(adminId);
            expect(audited.target!.id).to.equal(resp.body.id);
            expect(audited.target!.name).to.equal(resp.body.name);
          }
        );
      });
    });
  });
});
