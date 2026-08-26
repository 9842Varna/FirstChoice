import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AppHeader({ user, onLogout }) {
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [employeeProfilePic, setEmployeeProfilePic] = useState(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    updateDateTime();
    const timeInterval = setInterval(updateDateTime, 60000);
    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    if (user) {
      const profilePic = user.profile_pic || user.profileImage || null;
      setEmployeeProfilePic(profilePic);
    }
  }, [user]);

  const updateDateTime = () => {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = now.toLocaleString('en-US', { month: 'short' });
    const year = now.getFullYear();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    setCurrentDateTime(`${day}/${month}/${year} ${hours}:${minutes} ${ampm}`);
  };

  return (
    <>
      <StatusBar backgroundColor="#1976d2" barStyle="light-content" translucent={true} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.profileContainer}>
            {employeeProfilePic ? (
              <Image 
                source={{ uri: employeeProfilePic }} 
                style={styles.profileImage}
                onError={() => setEmployeeProfilePic(null)}
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profileInitial}>{user?.name?.charAt(0) || 'U'}</Text>
              </View>
            )}
          </View>
          <View>
            <Text style={styles.headerTitle}>RenewCare</Text>
            <Text style={styles.employeeName}>Welcome, {user?.name || 'Employee'}!</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.datetimeBox}>
            <Ionicons name="time-outline" size={14} color="#fff" />
            <Text style={styles.datetimeText}>{currentDateTime}</Text>
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: { 
    backgroundColor: '#1976d2', 
    paddingBottom: 12, 
    paddingHorizontal: 16, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  employeeName: { color: '#fff', fontSize: 11, opacity: 0.9, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  datetimeBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  datetimeText: { color: '#fff', fontSize: 10, fontWeight: '500' },
  logoutBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8 },
  profileContainer: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#fff' },
  profileImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  profilePlaceholder: { width: '100%', height: '100%', backgroundColor: '#1976d2', justifyContent: 'center', alignItems: 'center' },
  profileInitial: { fontSize: 14, fontWeight: '600', color: '#fff' },
});