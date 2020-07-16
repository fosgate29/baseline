import { BaselineApp } from '../src/index';
import { Vault } from 'provide-js';
import { assert } from 'console';
import { authenticateUser, configureRopstenFaucet, createUser, createOrgToken, promisedTimeout } from './utils';

const faucetAddress = process.env['FAUCET_ADDRESS'];
const faucetEncryptedPrivateKey = process.env['FAUCET_PRIVATE_KEY'];
const ropstenNetworkId = '66d44f30-9092-4182-a3c4-bc02736d6ae5'; // ropsten

let app: BaselineApp;
let bearerToken; // user's API credential
let configuredFaucet = false;
let user;

beforeEach(async () => {
  if (!user) {
    const email = `bob${new Date().getTime()}@baseline.local`;
    user = await createUser('Baseline', 'Bob', email, 'bobp455');
    const auth = await authenticateUser(email, 'bobp455');
    bearerToken = auth.responseBody['token'].token;
    assert(bearerToken, `failed to authorize bearer token for user ${email}`);

    if (!configuredFaucet && faucetAddress && faucetEncryptedPrivateKey) {
      configuredFaucet = await configureRopstenFaucet(
        5433,
        auth.responseBody['user'].id,
        faucetAddress,
        faucetEncryptedPrivateKey,
      );
      assert(configuredFaucet, 'failed to configure faucet');
    }
  }

  if (!app) {
    app = new BaselineApp(
      {
        identApiScheme: 'http',
        identApiHost: 'localhost:8085',
        nchainApiScheme: 'http',
        nchainApiHost: 'localhost:8086',
        networkId: ropstenNetworkId, // FIXME-- boostrap network genesis if no public testnet faucet is configured...
        token: bearerToken,
        vaultApiScheme: 'http',
        vaultApiHost: 'localhost:8083',
      },
      {
        bearerToken: bearerToken,
        natsServers: ['nats://localhost:4224'],
      },
    );
  }
});

describe('baseline', () => {
  beforeEach(async () => {
    assert(app, 'baseline app not initialized');
  });

  describe('baseline circuit', () => {
    let circuitArtifacts;
    let setupArtifacts;

    describe('compiling a circuit', () => {
      beforeEach(async () => {
        circuitArtifacts = await app.compileBaselineCircuit();
      });

      it('should have compiled the baseline circuit', async () => {
        assert(circuitArtifacts, 'should not be null');
        assert(circuitArtifacts.program, 'artifacts should contain the compiled circuit');
        assert(circuitArtifacts.abi, 'artifacts should contain the abi');
      });
    });

    describe('deploying a circuit', () => {
      beforeEach(async () => {
        setupArtifacts = await app.deployBaselineCircuit();
      });

      it('should have compiled and setup the baseline circuit', async () => {
        assert(setupArtifacts, 'should not be null');
        console.log(setupArtifacts);
      });
    });
  });

  describe('baseline messaging', () => {
    let natsService;

    afterEach(async () => {
      if (natsService && natsService.isConnected()) {
        natsService.disconnect();
      }
    });

    beforeEach(async () => {
      natsService = app.getMessagingService();
      natsService.connect();
      await promisedTimeout(1000);
    });

    it('should have an established NATS connection', async () => {
      assert(natsService, 'should not be null');
      assert(natsService.isConnected() === true, 'should have established a connection');
    });
  });

  describe('organization', () => {
    let org;
    let orgToken;

    describe('registration', () => {
      beforeEach(async () => {
        if (!org) {
          org = (await app.registerOrganization('Bob Corp', 'nats://bob-nats:4222'));
          assert(org, 'org should not be null');

          orgToken = (await createOrgToken(bearerToken, org.id)).responseBody['token'];
          assert(orgToken, 'org token should not be null');
        }
      });

      it('should register the organization in the local registry', async () => {
        assert(org.id, 'org id should not be null');
      });

      it('should create a default vault for the organization', async () => {
        const vaults = (await Vault.clientFactory(orgToken, 'http', 'localhost:8083').fetchVaults({})).responseBody;
        assert(vaults.length === 1, 'default vault not created');
      });
    });
  });

  describe('workgroup', () => {
    let workgroup;

    describe('creation', () => {
      beforeEach(async () => {
        if (!workgroup) {
          await promisedTimeout(3000);
          workgroup = (await app.createWorkgroup('baseline workgroup'));
          assert(workgroup, 'workgroup should not be null');
        }
      });

      it('should create the workgroup in the local registry', async () => {
        assert(workgroup.id, 'workgroup id should not be null');
      });

      it('should associate the organization with the local workgroup', async () => {
        const orgs = await app.fetchWorkgroupOrganizations();
        assert(orgs.length === 1, 'workgroup should have associated org');
      });

      it('should deploy the ERC1820 org registry contract for the workgroup', async () => {
        await promisedTimeout(75000); // HACK!!! FIXME!!! -- make this cleaner so we dont hang the tests...
        const orgRegistryContract = app.getWorkgroupContract('organization-registry');
        assert(orgRegistryContract, 'workgroup organization registry contract should not be null');
      });

      it('should register the organization with the on-chain org registry contract', async () => {

      });
    });

    describe('workflow', () => {
      describe('workstep', () => {

      });
    });
  });
});