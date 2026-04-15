'use client';

import { useState } from 'react';
import { updateProfile, updateBankDetails, updateNotificationPrefs, switchRole } from './actions';

interface SettingsTabsProps {
  profile: any;
  userEmail: string;
  userId: string;
}

type Tab = 'profile' | 'notifications' | 'danger';

export default function SettingsTabs({ profile, userEmail, userId }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'danger', label: 'Danger Zone' },
  ];

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-white/[0.03] rounded-lg p-1 border border-white/[0.06]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setMessage(''); }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.startsWith('Error') ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-green-500/10 border border-green-500/20 text-green-400'}`}>
          {message}
        </div>
      )}

      {activeTab === 'profile' && (
        <ProfileTab profile={profile} userEmail={userEmail} userId={userId} saving={saving} setSaving={setSaving} setMessage={setMessage} />
      )}
      {activeTab === 'notifications' && (
        <NotificationsTab profile={profile} saving={saving} setSaving={setSaving} setMessage={setMessage} />
      )}
      {activeTab === 'danger' && (
        <DangerTab profile={profile} userEmail={userEmail} saving={saving} setSaving={setSaving} setMessage={setMessage} />
      )}
    </div>
  );
}

function ProfileTab({ profile, userEmail, userId, saving, setSaving, setMessage }: any) {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [companyName, setCompanyName] = useState(profile?.company_name || '');
  const [gstin, setGstin] = useState(profile?.gstin || '');
  const [billingAddress, setBillingAddress] = useState(profile?.billing_address || '');
  const [timezone, setTimezone] = useState(profile?.timezone || 'Asia/Kolkata');
  const [phone, setPhone] = useState(profile?.phone || '');

  const [bankName, setBankName] = useState(profile?.bank_account_name || '');
  const [bankAccount, setBankAccount] = useState(profile?.bank_account_number || '');
  const [bankIfsc, setBankIfsc] = useState(profile?.bank_ifsc || '');

  const isHost = profile?.role === 'host';

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage('');
    try {
      await updateProfile({ full_name: fullName, company_name: companyName, gstin, billing_address: billingAddress, timezone, phone });
      setMessage('Profile updated successfully.');
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBank = async () => {
    setSaving(true);
    setMessage('');
    try {
      await updateBankDetails({ bank_account_name: bankName, bank_account_number: bankAccount, bank_ifsc: bankIfsc });
      setMessage('Bank details updated successfully.');
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const TIMEZONES = [
    'Asia/Kolkata', 'America/New_York', 'America/Chicago', 'America/Denver',
    'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Europe/Paris',
    'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore', 'Australia/Sydney', 'UTC',
  ];

  return (
    <div className="space-y-6">
      {/* Account info (read-only) */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">Account</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-0.5">Email</div>
            <div className="text-gray-300">{userEmail}</div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-0.5">User ID</div>
            <div className="text-gray-400 font-mono text-xs">{userId}</div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-0.5">Role</div>
            <div className="text-gray-300 capitalize">{profile?.role || 'renter'}</div>
          </div>
          <div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-0.5">KYC Status</div>
            <div className={`capitalize ${profile?.kyc_status === 'completed' ? 'text-green-400' : 'text-yellow-400'}`}>
              {profile?.kyc_status || 'pending'}
              {profile?.kyc_tier && <span className="text-gray-500 ml-1">({profile.kyc_tier})</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Editable profile */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-4">Personal Information</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Full Name" value={fullName} onChange={setFullName} placeholder="Your full name" />
          <Field label="Phone" value={phone} onChange={setPhone} placeholder="+91 9876543210" />
          <Field label="Company Name" value={companyName} onChange={setCompanyName} placeholder="Optional" />
          <Field label="GSTIN" value={gstin} onChange={setGstin} placeholder="22AAAAA0000A1Z5" />
          <div className="md:col-span-2">
            <Field label="Billing Address" value={billingAddress} onChange={setBillingAddress} placeholder="Street, City, State, PIN" textarea />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 uppercase tracking-wider mb-1 block">Timezone</label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full rounded-lg px-3 py-2 bg-black/50 border border-white/10 text-sm text-white focus:border-primary focus:outline-none"
            >
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="mt-4 bg-primary hover:bg-primary-dark text-black font-bold py-2 px-6 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      {/* Bank details (hosts only) */}
      {isHost && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
          <h3 className="text-sm font-bold text-white mb-1">Payout Details</h3>
          <p className="text-xs text-gray-500 mb-4">For receiving host earnings via bank transfer.</p>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Account Holder Name" value={bankName} onChange={setBankName} placeholder="As on bank account" />
            <Field label="IFSC Code" value={bankIfsc} onChange={setBankIfsc} placeholder="SBIN0001234" />
            <div className="md:col-span-2">
              <Field label="Account Number" value={bankAccount} onChange={setBankAccount} placeholder="Account number" />
            </div>
          </div>
          <button
            onClick={handleSaveBank}
            disabled={saving}
            className="mt-4 bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-6 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Bank Details'}
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationsTab({ profile, saving, setSaving, setMessage }: any) {
  const [lowBalance, setLowBalance] = useState(profile?.notify_low_balance ?? true);
  const [rentalActivity, setRentalActivity] = useState(profile?.notify_rental_activity ?? true);
  const [payout, setPayout] = useState(profile?.notify_payout ?? true);
  const [email, setEmail] = useState(profile?.notify_email ?? true);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await updateNotificationPrefs({
        notify_low_balance: lowBalance,
        notify_rental_activity: rentalActivity,
        notify_payout: payout,
        notify_email: email,
      });
      setMessage('Notification preferences saved.');
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggles = [
    { label: 'Low balance alerts', desc: 'Get notified when your wallet balance is running low', value: lowBalance, set: setLowBalance },
    { label: 'Rental activity', desc: 'Notifications when instances start, stop, or are destroyed', value: rentalActivity, set: setRentalActivity },
    { label: 'Payout notifications', desc: 'Alerts when host earnings are credited', value: payout, set: setPayout },
    { label: 'Email notifications', desc: 'Receive all notifications via email (turn off for in-app only)', value: email, set: setEmail },
  ];

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
      <h3 className="text-sm font-bold text-white mb-4">Email Notifications</h3>
      <div className="space-y-4">
        {toggles.map(t => (
          <div key={t.label} className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-white">{t.label}</div>
              <div className="text-xs text-gray-500">{t.desc}</div>
            </div>
            <button
              type="button"
              onClick={() => t.set(!t.value)}
              className={`relative w-10 h-5 rounded-full transition-colors ${t.value ? 'bg-primary' : 'bg-white/10'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${t.value ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-6 bg-primary hover:bg-primary-dark text-black font-bold py-2 px-6 rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  );
}

function DangerTab({ profile, userEmail, saving, setSaving, setMessage }: any) {
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const currentRole = profile?.role || 'renter';
  const targetRole = currentRole === 'host' ? 'renter' : 'host';

  const handleSwitch = async () => {
    setSaving(true);
    setMessage('');
    try {
      await switchRole(targetRole as 'host' | 'renter');
      setMessage(`Role switched to ${targetRole}. Reload the page to see changes.`);
      setConfirmSwitch(false);
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* KYC status */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">Verification Status</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">KYC Status</span>
            <span className={profile?.kyc_status === 'completed' ? 'text-green-400' : 'text-yellow-400'}>
              {profile?.kyc_status === 'completed' ? 'Completed' : 'Pending'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Phone Verified</span>
            <span className={profile?.phone_verified ? 'text-green-400' : 'text-gray-500'}>
              {profile?.phone_verified ? 'Yes' : 'No'}
            </span>
          </div>
          {currentRole === 'host' && (
            <div className="flex justify-between">
              <span className="text-gray-400">PAN Verified</span>
              <span className={profile?.pan_verified ? 'text-green-400' : 'text-gray-500'}>
                {profile?.pan_verified ? 'Yes' : 'No'}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">Trust Tier</span>
            <span className="text-gray-300 capitalize">{profile?.kyc_tier || 'none'}</span>
          </div>
        </div>
      </div>

      {/* Switch role */}
      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5">
        <h3 className="text-sm font-bold text-yellow-400 mb-1">Switch Account Role</h3>
        <p className="text-xs text-gray-400 mb-3">
          You are currently a <span className="text-white font-medium capitalize">{currentRole}</span>.
          Switch to <span className="text-white font-medium capitalize">{targetRole}</span> to{' '}
          {targetRole === 'host' ? 'start providing GPUs' : 'rent GPUs from the marketplace'}.
          {targetRole === 'host' && ' You may need to complete PAN verification.'}
        </p>
        {!confirmSwitch ? (
          <button
            onClick={() => setConfirmSwitch(true)}
            className="text-xs font-bold py-2 px-4 rounded-lg border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 transition-colors"
          >
            Switch to {targetRole}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSwitch}
              disabled={saving}
              className="text-xs font-bold py-2 px-4 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
            >
              {saving ? 'Switching...' : `Confirm switch to ${targetRole}`}
            </button>
            <button
              onClick={() => setConfirmSwitch(false)}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Delete account */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
        <h3 className="text-sm font-bold text-red-400 mb-1">Delete Account</h3>
        <p className="text-xs text-gray-400 mb-3">
          Permanently delete your account and all associated data. This cannot be undone.
          You must withdraw all funds first.
        </p>
        <a
          href={`mailto:support@velocity.cloud?subject=Account%20Deletion%20Request&body=Please%20delete%20my%20account:%20${userEmail}`}
          className="inline-block text-xs font-bold py-2 px-4 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
        >
          Request Account Deletion
        </a>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, textarea }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean;
}) {
  const cls = "w-full rounded-lg px-3 py-2 bg-black/50 border border-white/10 text-sm text-white focus:border-primary focus:outline-none placeholder:text-gray-600";
  return (
    <div>
      <label className="text-[11px] text-gray-500 uppercase tracking-wider mb-1 block">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={2} className={cls} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}
