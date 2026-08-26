import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from "./screens/LoginScreen";
import EmployeeDashboard from "./screens/EmployeeDashboard";
import PlantsScreen from "./screens/PlantsScreen";
import DashboardScreen from "./screens/DashboardScreen";
import ProfileScreen from "./screens/ProfileScreen";
import AppHeader from "./components/AppHeader";

// Admin Screens
import AdminHomeScreen from "./screens/Admin/AdminHomeScreen";
import AdminDashboardScreen from "./screens/Admin/AdminDashboardScreen";
import AdminPlantsScreen from "./screens/Admin/AdminPlantsScreen";
import AdminCustomersScreen from "./screens/Admin/AdminCustomersScreen";

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Employee tabs
  const [activeTab, setActiveTab] = useState('services');
  
  // Admin tabs (5 tabs: Services, Plants, Customers, Dashboard, Profile)
  const [adminTab, setAdminTab] = useState('services');
  
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('employeeData');
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userId');
      
      setIsLoggedIn(false);
      setUser(null);
      setUserRole(null);
      
    } catch (error) {
      console.error('Session check error:', error);
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (data) => {
    console.log('Login successful:', data);
    setUser(data);
    setUserRole(data.role || 'employee');
    setIsLoggedIn(true);
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutModal(false);
    try {
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('employeeData');
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userId');
      
      setUser(null);
      setIsLoggedIn(false);
      setUserRole(null);
      setActiveTab('services');
      setAdminTab('services');
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      setIsLoggedIn(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  // Employee navigation functions
  const switchToServicesTab = () => setActiveTab('services');
  const switchToPlantsTab = () => setActiveTab('plants');
  const switchToDashboardTab = () => setActiveTab('dashboard');
  const switchToProfileTab = () => setActiveTab('profile');

  // Admin navigation functions (5 tabs)
  const goToAdminServices = () => setAdminTab('services');
  const goToAdminPlants = () => setAdminTab('plants');
  const goToAdminCustomers = () => setAdminTab('customers');
  const goToAdminDashboard = () => setAdminTab('dashboard');
  const goToAdminProfile = () => setAdminTab('profile');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // ==================== ADMIN VIEW ====================
  if (userRole === 'admin') {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <AppHeader user={user} onLogout={handleLogout} />
          
          <View style={styles.content}>
            {adminTab === 'services' && <AdminHomeScreen user={user} />}
            {adminTab === 'plants' && <AdminPlantsScreen user={user} />}
            {adminTab === 'customers' && <AdminCustomersScreen user={user} />}
            {adminTab === 'dashboard' && <AdminDashboardScreen user={user} />}
            {adminTab === 'profile' && <ProfileScreen user={user} onLogout={handleLogout} hideHeader={true} />}
          </View>
          
          {/* Admin Bottom Navigation - 5 Tabs: Services, Plants, Customers, Dashboard, Profile */}
          <View style={styles.bottomNav}>
            <TouchableOpacity 
              style={styles.navItem}
              onPress={goToAdminServices}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={adminTab === 'services' ? 'construct' : 'construct-outline'} 
                size={24} 
                color={adminTab === 'services' ? '#1976d2' : '#9e9e9e'} 
              />
              <Text style={[styles.navLabel, adminTab === 'services' && styles.navLabelActive]}>
                Services
              </Text>
              {adminTab === 'services' && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navItem}
              onPress={goToAdminPlants}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={adminTab === 'plants' ? 'flash' : 'flash-outline'} 
                size={24} 
                color={adminTab === 'plants' ? '#1976d2' : '#9e9e9e'} 
              />
              <Text style={[styles.navLabel, adminTab === 'plants' && styles.navLabelActive]}>
                Plants
              </Text>
              {adminTab === 'plants' && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navItem}
              onPress={goToAdminCustomers}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={adminTab === 'customers' ? 'people' : 'people-outline'} 
                size={24} 
                color={adminTab === 'customers' ? '#1976d2' : '#9e9e9e'} 
              />
              <Text style={[styles.navLabel, adminTab === 'customers' && styles.navLabelActive]}>
                Customers
              </Text>
              {adminTab === 'customers' && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navItem}
              onPress={goToAdminDashboard}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={adminTab === 'dashboard' ? 'pie-chart' : 'pie-chart-outline'} 
                size={24} 
                color={adminTab === 'dashboard' ? '#1976d2' : '#9e9e9e'} 
              />
              <Text style={[styles.navLabel, adminTab === 'dashboard' && styles.navLabelActive]}>
                Dashboard
              </Text>
              {adminTab === 'dashboard' && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navItem}
              onPress={goToAdminProfile}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={adminTab === 'profile' ? 'person-circle' : 'person-circle-outline'} 
                size={24} 
                color={adminTab === 'profile' ? '#1976d2' : '#9e9e9e'} 
              />
              <Text style={[styles.navLabel, adminTab === 'profile' && styles.navLabelActive]}>
                Profile
              </Text>
              {adminTab === 'profile' && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          </View>

          {/* Custom Logout Modal */}
          <Modal
            transparent={true}
            visible={showLogoutModal}
            animationType="fade"
            onRequestClose={() => setShowLogoutModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.logoutModalContainer}>
                <View style={styles.logoutModalIcon}>
                  <Ionicons name="log-out-outline" size={40} color="#FF6B6B" />
                </View>
                <Text style={styles.logoutModalTitle}>Logout?</Text>
                <Text style={styles.logoutModalMessage}>
                  You will be logged out of your account
                </Text>
                <View style={styles.logoutModalButtons}>
                  <TouchableOpacity 
                    style={styles.cancelBtn} 
                    onPress={() => setShowLogoutModal(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.confirmBtn} 
                    onPress={handleLogoutConfirm}
                  >
                    <Text style={styles.confirmBtnText}>Logout</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </SafeAreaProvider>
    );
  }

  // ==================== EMPLOYEE VIEW ====================
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <AppHeader user={user} onLogout={handleLogout} />
        
        <View style={styles.content}>
          {activeTab === 'services' && (
            <EmployeeDashboard user={user} onLogout={handleLogout} hideHeader={true} />
          )}
          {activeTab === 'plants' && (
            <PlantsScreen user={user} onBackToServices={switchToServicesTab} hideHeader={true} />
          )}
          {activeTab === 'dashboard' && (
            <DashboardScreen 
              user={user} 
              onBackToServices={switchToServicesTab} 
              onLogout={handleLogout}
              hideHeader={true}
            />
          )}
          {activeTab === 'profile' && (
            <ProfileScreen user={user} onLogout={handleLogout} hideHeader={true} />
          )}
        </View>
        
        {/* Bottom Navigation - Employee */}
        <View style={styles.bottomNav}>
          <TouchableOpacity 
            style={styles.navItem}
            onPress={switchToServicesTab}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={activeTab === 'services' ? 'construct' : 'construct-outline'} 
              size={24} 
              color={activeTab === 'services' ? '#1976d2' : '#9e9e9e'} 
            />
            <Text style={[styles.navLabel, activeTab === 'services' && styles.navLabelActive]}>
              Services
            </Text>
            {activeTab === 'services' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navItem}
            onPress={switchToPlantsTab}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={activeTab === 'plants' ? 'flash' : 'flash-outline'} 
              size={24} 
              color={activeTab === 'plants' ? '#1976d2' : '#9e9e9e'} 
            />
            <Text style={[styles.navLabel, activeTab === 'plants' && styles.navLabelActive]}>
              Plants
            </Text>
            {activeTab === 'plants' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navItem}
            onPress={switchToDashboardTab}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={activeTab === 'dashboard' ? 'pie-chart' : 'pie-chart-outline'} 
              size={24} 
              color={activeTab === 'dashboard' ? '#1976d2' : '#9e9e9e'} 
            />
            <Text style={[styles.navLabel, activeTab === 'dashboard' && styles.navLabelActive]}>
              Dashboard
            </Text>
            {activeTab === 'dashboard' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navItem}
            onPress={switchToProfileTab}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={activeTab === 'profile' ? 'person-circle' : 'person-circle-outline'} 
              size={24} 
              color={activeTab === 'profile' ? '#1976d2' : '#9e9e9e'} 
            />
            <Text style={[styles.navLabel, activeTab === 'profile' && styles.navLabelActive]}>
              Profile
            </Text>
            {activeTab === 'profile' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        </View>

        {/* Custom Logout Modal */}
        <Modal
          transparent={true}
          visible={showLogoutModal}
          animationType="fade"
          onRequestClose={() => setShowLogoutModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.logoutModalContainer}>
              <View style={styles.logoutModalIcon}>
                <Ionicons name="log-out-outline" size={40} color="#FF6B6B" />
              </View>
              <Text style={styles.logoutModalTitle}>Logout?</Text>
              <Text style={styles.logoutModalMessage}>
                You will be logged out of your account
              </Text>
              <View style={styles.logoutModalButtons}>
                <TouchableOpacity 
                  style={styles.cancelBtn} 
                  onPress={() => setShowLogoutModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.confirmBtn} 
                  onPress={handleLogoutConfirm}
                >
                  <Text style={styles.confirmBtnText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1976d2',
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    height: 70,
    borderTopWidth: 1,
    borderTopColor: '#e8eaed',
    paddingHorizontal: 8,
    paddingBottom: 10,
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  navItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  navLabel: {
    fontSize: 11,
    color: '#9e9e9e',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  navLabelActive: {
    color: '#1976d2',
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -10,
    width: 25,
    height: 3,
    backgroundColor: '#1976d2',
    borderRadius: 1.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutModalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '75%',
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutModalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoutModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  logoutModalMessage: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  logoutModalButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#888',
  },
  confirmBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#dc3545',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});