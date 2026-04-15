#!/usr/bin/env node

const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

const CONFIG_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.velocity');
const CONFIG_FILE = path.join(CONFIG_DIR, 'credentials.json');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dmzeaolugvuykaqgcbji.supabase.co';
const API_URL = process.env.VELOCITY_API_URL || 'https://velocity-infra.vercel.app';

function saveCredentials(apiKey) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ apiKey }, null, 2));
  console.log('Successfully logged in. API key saved to ~/.velocity/credentials.json');
}

function getCredentials() {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.error('Not logged in. Please run `velocity login --api-key <key>` first.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

function isVelocityKey(key) {
  return key.startsWith('vi_live_');
}

async function getHeaders() {
  const { apiKey } = getCredentials();
  if (isVelocityKey(apiKey)) {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Velocity-Key': 'true'
    };
  }
  return {
    'apikey': apiKey,
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
}

async function getSupabaseHeaders() {
  const { apiKey } = getCredentials();
  if (isVelocityKey(apiKey)) {
    const res = await axios.post(`${API_URL}/api/keys/validate`, {}, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!res.data.valid) throw new Error('Invalid API key');
    return {
      'apikey': process.env.SUPABASE_ANON_KEY || apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-User-Id': res.data.user_id
    };
  }
  return {
    'apikey': apiKey,
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
}

program
  .name('velocity')
  .description('Velocity Infra CLI — GPU Cloud Marketplace for India')
  .version('3.0.0');

// ─── AUTH ────────────────────────────────────────────────────────

program
  .command('login')
  .description('Authenticate with your Velocity API key (get one from Settings > API Keys)')
  .requiredOption('--api-key <key>', 'Your Velocity API key')
  .action((options) => {
    saveCredentials(options.apiKey);
  });

// ─── HOST: MACHINE MANAGEMENT ────────────────────────────────────

program
  .command('show-machines')
  .description('[Host] Show all your hosted machines')
  .action(async () => {
    try {
      const headers = await getSupabaseHeaders();
      const userRes = await axios.get(`${SUPABASE_URL}/auth/v1/user`, { headers });
      const userId = userRes.data.id;

      const response = await axios.get(
        `${SUPABASE_URL}/rest/v1/machines?host_id=eq.${userId}&select=id,gpu_model,gpu_count,vram_gb,ram_gb,status,listed,gpu_allocated,machine_tier,reliability_score,public_ip,last_heartbeat`,
        { headers }
      );

      if (response.data.length === 0) {
        console.log('No machines found. Add a machine from the dashboard first.');
        return;
      }

      console.table(response.data.map(m => ({
        ID: m.id.substring(0, 8),
        GPU: `${m.gpu_count}x ${m.gpu_model}`,
        VRAM: `${m.vram_gb}GB`,
        Status: m.status,
        Listed: m.listed ? 'Yes' : 'No',
        'Alloc/Total': `${m.gpu_allocated || 0}/${m.gpu_count}`,
        Tier: m.machine_tier || 'unverified',
        Reliability: `${(m.reliability_score || 0).toFixed(1)}%`,
      })));
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
    }
  });

program
  .command('list-machine')
  .description('[Host] Create an offer to list a machine for rent')
  .requiredOption('--machine <id>', 'Machine ID (first 8 chars or full UUID)')
  .requiredOption('-g, --price-gpu <price>', 'Per-GPU hourly rate in INR')
  .option('-s, --price-storage <price>', 'Storage price in INR/GB/month', '4.5')
  .option('-m, --min-gpu <count>', 'Minimum GPU chunk size (power of 2)', '1')
  .option('-e, --end-date <date>', 'Offer end date (ISO 8601 or "YYYY-MM-DD")')
  .option('-r, --discount-rate <rate>', 'Max reserved discount factor (0.0-1.0)', '0.4')
  .option('--min-bid <price>', 'Minimum interruptible bid price per GPU/hr in INR')
  .action(async (options) => {
    try {
      const headers = await getSupabaseHeaders();
      const userRes = await axios.get(`${SUPABASE_URL}/auth/v1/user`, { headers });

      const machineRes = await axios.get(
        `${SUPABASE_URL}/rest/v1/machines?id=ilike.${options.machine}*&host_id=eq.${userRes.data.id}&select=id,gpu_count`,
        { headers }
      );
      if (machineRes.data.length === 0) {
        console.error('Machine not found or not owned by you.');
        return;
      }
      const machine = machineRes.data[0];

      const endDate = options.endDate
        ? new Date(options.endDate).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const payload = {
        machine_id: machine.id,
        host_id: userRes.data.id,
        price_per_gpu_hr_inr: parseFloat(options.priceGpu),
        storage_price_per_gb_month_inr: parseFloat(options.priceStorage),
        min_gpu: parseInt(options.minGpu),
        offer_end_date: endDate,
        reserved_discount_factor: parseFloat(options.discountRate),
      };

      if (options.minBid) {
        payload.interruptible_min_price_inr = parseFloat(options.minBid);
      }

      const res = await axios.post(`${SUPABASE_URL}/rest/v1/offers`, payload, {
        headers,
        params: { select: 'id' }
      });

      await axios.patch(
        `${SUPABASE_URL}/rest/v1/machines?id=eq.${machine.id}`,
        { listed: true, status: 'available' },
        { headers }
      );

      console.log(`Offer created: ${res.data[0].id.substring(0, 8)}`);
      console.log(`Machine ${options.machine} is now listed at ₹${options.priceGpu}/GPU/hr`);
      console.log(`Offer expires: ${endDate}`);
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
    }
  });

program
  .command('unlist-machine')
  .description('[Host] Unlist a machine (stop new rentals, existing contracts continue)')
  .requiredOption('--machine <id>', 'Machine ID')
  .action(async (options) => {
    try {
      const headers = await getSupabaseHeaders();
      const userRes = await axios.get(`${SUPABASE_URL}/auth/v1/user`, { headers });

      const machineRes = await axios.get(
        `${SUPABASE_URL}/rest/v1/machines?id=ilike.${options.machine}*&host_id=eq.${userRes.data.id}&select=id`,
        { headers }
      );
      if (machineRes.data.length === 0) {
        console.error('Machine not found.');
        return;
      }
      const machineId = machineRes.data[0].id;

      await axios.patch(
        `${SUPABASE_URL}/rest/v1/offers?machine_id=eq.${machineId}&status=eq.active`,
        { status: 'unlisted' },
        { headers }
      );

      await axios.patch(
        `${SUPABASE_URL}/rest/v1/machines?id=eq.${machineId}`,
        { listed: false },
        { headers }
      );

      console.log(`Machine ${options.machine} unlisted. Existing rental contracts are unaffected.`);
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
    }
  });

program
  .command('set-min-bid')
  .description('[Host] Set the minimum interruptible bid price for a machine')
  .requiredOption('--machine <id>', 'Machine ID')
  .requiredOption('--price <inr>', 'Minimum bid price per GPU/hr in INR')
  .action(async (options) => {
    try {
      const headers = await getSupabaseHeaders();
      const userRes = await axios.get(`${SUPABASE_URL}/auth/v1/user`, { headers });

      const machineRes = await axios.get(
        `${SUPABASE_URL}/rest/v1/machines?id=ilike.${options.machine}*&host_id=eq.${userRes.data.id}&select=id`,
        { headers }
      );
      if (machineRes.data.length === 0) {
        console.error('Machine not found.');
        return;
      }

      await axios.patch(
        `${SUPABASE_URL}/rest/v1/offers?machine_id=eq.${machineRes.data[0].id}&status=eq.active`,
        { interruptible_min_price_inr: parseFloat(options.price) },
        { headers }
      );

      console.log(`Minimum interruptible bid set to ₹${options.price}/GPU/hr`);
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
    }
  });

program
  .command('schedule-maint')
  .description('[Host] Schedule a maintenance window')
  .requiredOption('--machine <id>', 'Machine ID')
  .requiredOption('--sdate <epoch>', 'Maintenance start (Unix epoch seconds or ISO date)')
  .option('--duration <hours>', 'Duration in hours', '1')
  .action(async (options) => {
    try {
      const headers = await getSupabaseHeaders();
      const userRes = await axios.get(`${SUPABASE_URL}/auth/v1/user`, { headers });

      const machineRes = await axios.get(
        `${SUPABASE_URL}/rest/v1/machines?id=ilike.${options.machine}*&host_id=eq.${userRes.data.id}&select=id`,
        { headers }
      );
      if (machineRes.data.length === 0) {
        console.error('Machine not found.');
        return;
      }

      const startDate = isNaN(options.sdate)
        ? new Date(options.sdate).toISOString()
        : new Date(parseInt(options.sdate) * 1000).toISOString();

      await axios.post(`${SUPABASE_URL}/rest/v1/maintenance_windows`, {
        machine_id: machineRes.data[0].id,
        start_date: startDate,
        duration_hrs: parseFloat(options.duration),
      }, { headers });

      console.log(`Maintenance scheduled for ${startDate} (${options.duration}h)`);
      console.log('Active renters will be notified to save their work.');
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
    }
  });

program
  .command('cancel-maint')
  .description('[Host] Cancel scheduled maintenance')
  .requiredOption('--machine <id>', 'Machine ID')
  .action(async (options) => {
    try {
      const headers = await getSupabaseHeaders();
      const userRes = await axios.get(`${SUPABASE_URL}/auth/v1/user`, { headers });

      const machineRes = await axios.get(
        `${SUPABASE_URL}/rest/v1/machines?id=ilike.${options.machine}*&host_id=eq.${userRes.data.id}&select=id`,
        { headers }
      );
      if (machineRes.data.length === 0) {
        console.error('Machine not found.');
        return;
      }

      await axios.patch(
        `${SUPABASE_URL}/rest/v1/maintenance_windows?machine_id=eq.${machineRes.data[0].id}&status=eq.scheduled`,
        { status: 'cancelled' },
        { headers }
      );

      console.log('Scheduled maintenance cancelled.');
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
    }
  });

program
  .command('self-test')
  .description('[Host] Show self-test results for a machine')
  .requiredOption('--machine <id>', 'Machine ID')
  .action(async (options) => {
    try {
      const headers = await getSupabaseHeaders();
      const userRes = await axios.get(`${SUPABASE_URL}/auth/v1/user`, { headers });

      const machineRes = await axios.get(
        `${SUPABASE_URL}/rest/v1/machines?id=ilike.${options.machine}*&host_id=eq.${userRes.data.id}&select=id,self_test_passed,self_test_at,cuda_version,inet_down_mbps,inet_up_mbps,pcie_bandwidth_gbps,dlperf_score,reliability_score,gpu_temp,gpu_memory_total_mb`,
        { headers }
      );
      if (machineRes.data.length === 0) {
        console.error('Machine not found.');
        return;
      }

      const m = machineRes.data[0];
      console.log('\n=== Self-Test Results ===');
      console.log(`Machine:       ${m.id.substring(0, 8)}`);
      console.log(`Passed:        ${m.self_test_passed ? 'YES' : 'NO'}`);
      console.log(`Last Test:     ${m.self_test_at || 'Never'}`);
      console.log(`CUDA:          ${m.cuda_version || 'N/A'}`);
      console.log(`Net Down:      ${m.inet_down_mbps || 0} Mbps`);
      console.log(`Net Up:        ${m.inet_up_mbps || 0} Mbps`);
      console.log(`PCIe BW:       ${m.pcie_bandwidth_gbps || 0} GB/s`);
      console.log(`DLPerf:        ${m.dlperf_score || 0} TFLOPS`);
      console.log(`Reliability:   ${(m.reliability_score || 0).toFixed(1)}%`);
      console.log(`GPU Temp:      ${m.gpu_temp || 0}°C`);
      console.log(`GPU VRAM:      ${((m.gpu_memory_total_mb || 0) / 1024).toFixed(1)} GB`);
      console.log('\nTo run a new self-test: python agent.py --self-test');
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
    }
  });

program
  .command('cleanup-machine')
  .description('[Host] Remove expired contract storage allocations')
  .requiredOption('--machine <id>', 'Machine ID')
  .action(async (options) => {
    try {
      const headers = await getSupabaseHeaders();
      const userRes = await axios.get(`${SUPABASE_URL}/auth/v1/user`, { headers });

      const machineRes = await axios.get(
        `${SUPABASE_URL}/rest/v1/machines?id=ilike.${options.machine}*&host_id=eq.${userRes.data.id}&select=id,gpu_count`,
        { headers }
      );
      if (machineRes.data.length === 0) {
        console.error('Machine not found.');
        return;
      }
      const machine = machineRes.data[0];

      const { data: activeContracts } = await axios.get(
        `${SUPABASE_URL}/rest/v1/rental_contracts?machine_id=eq.${machine.id}&status=eq.active&select=gpu_count`,
        { headers }
      );

      const totalAllocated = (activeContracts || []).reduce((sum, c) => sum + c.gpu_count, 0);

      await axios.patch(
        `${SUPABASE_URL}/rest/v1/machines?id=eq.${machine.id}`,
        { gpu_allocated: totalAllocated },
        { headers }
      );

      console.log(`Cleanup complete. GPU allocation corrected to ${totalAllocated}/${machine.gpu_count}`);
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
    }
  });

// ─── RENTER: SEARCH & DEPLOY ────────────────────────────────────

program
  .command('search-offers')
  .description('Search for available GPU offers')
  .option('--gpu <model>', 'Filter by GPU model (e.g., 4090, A100)')
  .option('--max-price <price>', 'Maximum price per GPU/hr in INR')
  .option('--min-gpu <count>', 'Minimum available GPU count')
  .option('--verified', 'Only show verified machines')
  .action(async (options) => {
    try {
      const headers = await getSupabaseHeaders();
      let url = `${SUPABASE_URL}/rest/v1/offers?status=eq.active&select=id,price_per_gpu_hr_inr,min_gpu,offer_end_date,interruptible_min_price_inr,reserved_discount_factor,storage_price_per_gb_month_inr,machines(id,gpu_model,gpu_count,vram_gb,ram_gb,vcpu_count,gpu_allocated,machine_tier,reliability_score,inet_down_mbps,location)`;

      const response = await axios.get(url, { headers });
      let offers = response.data;

      if (options.gpu) {
        offers = offers.filter(o => o.machines?.gpu_model?.toLowerCase().includes(options.gpu.toLowerCase()));
      }
      if (options.maxPrice) {
        offers = offers.filter(o => o.price_per_gpu_hr_inr <= parseFloat(options.maxPrice));
      }
      if (options.minGpu) {
        offers = offers.filter(o => {
          const avail = (o.machines?.gpu_count || 0) - (o.machines?.gpu_allocated || 0);
          return avail >= parseInt(options.minGpu);
        });
      }
      if (options.verified) {
        offers = offers.filter(o => o.machines?.machine_tier === 'verified' || o.machines?.machine_tier === 'secure_cloud');
      }

      if (offers.length === 0) {
        console.log('No offers found matching your criteria.');
        return;
      }

      console.table(offers.map(o => ({
        ID: o.id.substring(0, 8),
        GPU: `${o.machines?.gpu_count}x ${o.machines?.gpu_model}`,
        Available: `${(o.machines?.gpu_count || 0) - (o.machines?.gpu_allocated || 0)} GPUs`,
        MinGPU: o.min_gpu,
        'Price/GPU/hr': `₹${o.price_per_gpu_hr_inr}`,
        Spot: o.interruptible_min_price_inr ? `₹${o.interruptible_min_price_inr}` : '-',
        Tier: o.machines?.machine_tier || 'unverified',
        Reliability: `${(o.machines?.reliability_score || 0).toFixed(1)}%`,
        Expires: o.offer_end_date?.substring(0, 10),
      })));
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
    }
  });

program
  .command('create-instance')
  .description('Rent GPUs from an offer')
  .requiredOption('--offer <id>', 'Offer ID (first 8 chars or full UUID)')
  .requiredOption('--template <name>', 'Template name (e.g., pytorch, ubuntu)')
  .option('--gpus <count>', 'Number of GPUs to rent', '1')
  .option('--disk <gb>', 'Disk size in GB', '50')
  .option('--type <type>', 'Rental type: on_demand, reserved, interruptible', 'on_demand')
  .option('--bid <price>', 'Bid price for interruptible (INR/GPU/hr)')
  .action(async (options) => {
    try {
      const supabaseHeaders = await getSupabaseHeaders();
      const userRes = await axios.get(`${SUPABASE_URL}/auth/v1/user`, { headers: supabaseHeaders });

      const offerRes = await axios.get(
        `${SUPABASE_URL}/rest/v1/offers?id=ilike.${options.offer}*&status=eq.active&select=id,machine_id,min_gpu,price_per_gpu_hr_inr,machines(gpu_count,gpu_allocated)`,
        { headers: supabaseHeaders }
      );
      if (offerRes.data.length === 0) {
        console.error('Offer not found or no longer active.');
        return;
      }
      const offer = offerRes.data[0];

      const templateRes = await axios.get(
        `${SUPABASE_URL}/rest/v1/templates?name=eq.${options.template}`,
        { headers: supabaseHeaders }
      );
      if (templateRes.data.length === 0) {
        console.error('Template not found.');
        return;
      }
      const template = templateRes.data[0];

      const gpuCount = parseInt(options.gpus);
      const available = (offer.machines?.gpu_count || 0) - (offer.machines?.gpu_allocated || 0);
      if (gpuCount > available) {
        console.error(`Only ${available} GPUs available. Requested ${gpuCount}.`);
        return;
      }

      const apiHeaders = await getHeaders();
      const response = await axios.post(
        `${API_URL}/api/console/rent`,
        {
          offerId: offer.id,
          gpuCount,
          templateId: template.id,
          diskSize: parseInt(options.disk),
          launchMode: template.launch_mode || 'ssh',
          rentalType: options.type,
          bidPriceInr: options.bid ? parseFloat(options.bid) : undefined,
        },
        { headers: apiHeaders }
      );

      const result = response.data;
      console.log(`Instance created: ${result.instance.id.substring(0, 8)}`);
      console.log(`Contract:   ${result.contract.id.substring(0, 8)}`);
      console.log(`GPUs:       ${gpuCount}x on devices [${result.contract.gpu_indices.join(', ')}]`);
      console.log(`Rate:       ₹${offer.price_per_gpu_hr_inr}/GPU/hr`);
      console.log(`Expires:    ${result.contract.rental_end_date}`);
      console.log('\nThe host agent is pulling the image and starting the container.');
      console.log('Use `velocity list` to check status.');
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
    }
  });

// ─── RENTER: INSTANCE MANAGEMENT ────────────────────────────────

program
  .command('list')
  .description('List your active instances')
  .action(async () => {
    try {
      const headers = await getSupabaseHeaders();
      const userRes = await axios.get(`${SUPABASE_URL}/auth/v1/user`, { headers });
      const userId = userRes.data.id;

      const response = await axios.get(
        `${SUPABASE_URL}/rest/v1/instances?renter_id=eq.${userId}&status=neq.destroyed&select=id,status,launch_mode,host_port,gpu_count,gpu_indices,rental_type,tunnel_url,machines(public_ip,gpu_model,gpu_count)`,
        { headers }
      );
      const instances = response.data;

      if (instances.length === 0) {
        console.log('No active instances found.');
        return;
      }

      console.table(instances.map(i => ({
        ID: i.id.substring(0, 8),
        GPU: i.machines ? `${i.gpu_count || 1}x ${i.machines.gpu_model}` : 'Unknown',
        Devices: (i.gpu_indices || []).join(','),
        Status: i.status,
        Type: i.rental_type || 'on_demand',
        Mode: i.launch_mode,
        Connection: i.tunnel_url || (i.machines?.public_ip && i.host_port ? `${i.machines.public_ip}:${i.host_port}` : 'Pending'),
      })));
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
    }
  });

program
  .command('ssh')
  .description('SSH into a running instance')
  .requiredOption('--instance <id>', 'Instance ID (first 8 chars or full UUID)')
  .action(async (options) => {
    try {
      const headers = await getSupabaseHeaders();
      const response = await axios.get(
        `${SUPABASE_URL}/rest/v1/instances?id=ilike.${options.instance}*&select=id,status,host_port,tunnel_url,machines(public_ip)`,
        { headers }
      );

      if (response.data.length === 0) {
        console.error('Instance not found.');
        return;
      }

      const instance = response.data[0];
      if (instance.status !== 'running') {
        console.error(`Instance is not running (status: ${instance.status}).`);
        return;
      }

      if (instance.tunnel_url) {
        const host = instance.tunnel_url.replace('https://', '').replace('http://', '');
        console.log(`Connecting via tunnel to root@${host} -p 443...`);
        execSync(`ssh -o StrictHostKeyChecking=no root@${host} -p 443`, { stdio: 'inherit' });
      } else if (instance.machines?.public_ip && instance.host_port) {
        const ip = instance.machines.public_ip;
        const port = instance.host_port;
        console.log(`Connecting to root@${ip} -p ${port}...`);
        execSync(`ssh -o StrictHostKeyChecking=no root@${ip} -p ${port}`, { stdio: 'inherit' });
      } else {
        console.error('Connection details not available yet.');
      }
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
    }
  });

program
  .command('ssh-config')
  .description('Generate SSH config entries for all running instances')
  .action(async () => {
    try {
      const headers = await getSupabaseHeaders();
      const userRes = await axios.get(`${SUPABASE_URL}/auth/v1/user`, { headers });
      const userId = userRes.data.id;

      const response = await axios.get(
        `${SUPABASE_URL}/rest/v1/instances?renter_id=eq.${userId}&status=eq.running&select=id,host_port,tunnel_url,machines(public_ip)`,
        { headers }
      );
      const instances = response.data;

      if (instances.length === 0) {
        console.log('No running instances found.');
        return;
      }

      console.log('# Velocity Infra SSH Config');
      console.log('# Add this to ~/.ssh/config\n');

      for (const inst of instances) {
        const host = inst.tunnel_url
          ? inst.tunnel_url.replace('https://', '').replace('http://', '')
          : inst.machines?.public_ip || 'pending';
        const port = inst.tunnel_url ? 443 : inst.host_port || 22;

        console.log(`Host velocity-${inst.id.substring(0, 8)}`);
        console.log(`  HostName ${host}`);
        console.log(`  User root`);
        console.log(`  Port ${port}`);
        console.log(`  StrictHostKeyChecking no`);
        console.log('');
      }

      console.log('# Then run: code --remote ssh-remote+velocity-<id> /root');
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
    }
  });

program
  .command('show-earnings')
  .description('[Host] Show earnings summary')
  .action(async () => {
    try {
      const headers = await getSupabaseHeaders();
      const userRes = await axios.get(`${SUPABASE_URL}/auth/v1/user`, { headers });
      const userId = userRes.data.id;

      const { data: profile } = await axios.get(
        `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=wallet_balance_inr`,
        { headers }
      );

      const { data: payouts } = await axios.get(
        `${SUPABASE_URL}/rest/v1/transactions?user_id=eq.${userId}&type=eq.host_payout&select=amount_inr`,
        { headers }
      );

      const totalEarned = (payouts || []).reduce((sum, t) => sum + t.amount_inr, 0);

      console.log('\n=== Earnings Summary ===');
      console.log(`Current Balance:  ₹${(profile?.[0]?.wallet_balance_inr || 0).toFixed(2)}`);
      console.log(`Total Earned:     ₹${totalEarned.toFixed(2)}`);
      console.log(`Total Payouts:    ${(payouts || []).length}`);
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
    }
  });

program.parse(process.argv);
