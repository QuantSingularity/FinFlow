import type React from "react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Layout from "../components/common/Layout";
import type { AppDispatch, RootState } from "../store";
import { logout } from "../store/authSlice";
import { toggleDarkMode } from "../store/uiSlice";

const Settings: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { darkMode } = useSelector((state: RootState) => state.ui);
  const { user } = useSelector((state: RootState) => state.auth);
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {/* Account Settings */}
          <div className="card mb-6">
            <h2 className="text-xl font-medium mb-4">Account Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="input"
                  value={user?.email || ""}
                  disabled
                />
                <p className="mt-1 text-sm text-gray-500">
                  Your email address is used for login and notifications
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <button className="btn btn-secondary">Change Password</button>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="card mb-6">
            <h2 className="text-xl font-medium mb-4">Notification Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">
                    In-app Notifications
                  </h3>
                  <p className="text-sm text-gray-500">
                    Receive notifications within the application
                  </p>
                </div>
                <div className="relative inline-block w-10 mr-2 align-middle select-none">
                  <input
                    type="checkbox"
                    id="toggle-notifications"
                    className="sr-only"
                    checked={notifications}
                    onChange={() => setNotifications(!notifications)}
                  />
                  <label
                    htmlFor="toggle-notifications"
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer ${
                      notifications ? "bg-primary-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`block h-6 w-6 rounded-full bg-white transform transition-transform ${
                        notifications ? "translate-x-4" : "translate-x-0"
                      }`}
                    ></span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">
                    Email Updates
                  </h3>
                  <p className="text-sm text-gray-500">
                    Receive updates and notifications via email
                  </p>
                </div>
                <div className="relative inline-block w-10 mr-2 align-middle select-none">
                  <input
                    type="checkbox"
                    id="toggle-email"
                    className="sr-only"
                    checked={emailUpdates}
                    onChange={() => setEmailUpdates(!emailUpdates)}
                  />
                  <label
                    htmlFor="toggle-email"
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer ${
                      emailUpdates ? "bg-primary-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`block h-6 w-6 rounded-full bg-white transform transition-transform ${
                        emailUpdates ? "translate-x-4" : "translate-x-0"
                      }`}
                    ></span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Appearance Settings */}
          <div className="card">
            <h2 className="text-xl font-medium mb-4">Appearance</h2>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Dark Mode</h3>
                <p className="text-sm text-gray-500">
                  Switch between light and dark theme
                </p>
              </div>
              <div className="relative inline-block w-10 mr-2 align-middle select-none">
                <input
                  type="checkbox"
                  id="toggle-theme"
                  className="sr-only"
                  checked={darkMode}
                  onChange={() => dispatch(toggleDarkMode())}
                />
                <label
                  htmlFor="toggle-theme"
                  className={`block overflow-hidden h-6 rounded-full cursor-pointer ${
                    darkMode ? "bg-primary-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`block h-6 w-6 rounded-full bg-white transform transition-transform ${
                      darkMode ? "translate-x-4" : "translate-x-0"
                    }`}
                  ></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div>
          {/* Account Actions */}
          <div className="card">
            <h2 className="text-xl font-medium mb-4">Account Actions</h2>
            <div className="space-y-4">
              <button onClick={handleLogout} className="w-full btn btn-danger">
                Log Out
              </button>

              <button className="w-full btn btn-secondary">Export Data</button>

              <button className="w-full text-red-600 hover:text-red-800">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
