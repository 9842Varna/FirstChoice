import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { useState, useEffect } from "react";
import axios from "axios";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ onLogin }) {

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [msg, setMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  /*const API_URL = "http://10.196.32.8:2927/api/login";
  const API_BASE = "http://10.196.32.8:2927";*/

  const API_URL = "http://192.168.29.223:2927/api/login";
  const API_BASE = "http://192.168.29.223:2927";

  useEffect(() => {
    // Only load saved credentials for Remember Me, but DO NOT auto-login
    loadSavedCredentials();
    
    // 🔥 IMPORTANT: Clear any existing session to prevent auto-login
    clearExistingSession();
  }, []);

  // 🔥 NEW: Clear any existing session on app start
  const clearExistingSession = async () => {
    try {
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('employeeData');
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userId');
      console.log('Session cleared - user must login manually');
    } catch (err) {
      console.log('Error clearing session:', err);
    }
  };

  const loadSavedCredentials = async () => {
    try {
      const rememberValue = await AsyncStorage.getItem("rememberMe");
      const isRemember = rememberValue === "true";
      setRemember(isRemember);
      
      if (isRemember) {
        const savedUser = await AsyncStorage.getItem("savedUserId");
        const savedPassword = await AsyncStorage.getItem("savedPassword");
        
        // Only fill the input fields, but DO NOT auto-login
        if (savedUser) setUserId(savedUser);
        if (savedPassword) setPassword(savedPassword);
      }
    } catch (err) {
      console.log("Error loading credentials:", err);
    }
  };

  const toggleRemember = async () => {
    const newValue = !remember;
    setRemember(newValue);
    await AsyncStorage.setItem("rememberMe", newValue.toString());

    if (!newValue) {
      await AsyncStorage.removeItem("savedUserId");
      await AsyncStorage.removeItem("savedPassword");
    }
  };

  useEffect(() => {
    const saveCredentials = async () => {
      if (remember && userId && password) {
        await AsyncStorage.setItem("savedUserId", userId);
        await AsyncStorage.setItem("savedPassword", password);
      }
    };
    saveCredentials();
  }, [userId, password, remember]);

  // Convert database role to app role
  const convertRole = (dbRole) => {
    if (!dbRole) return "employee";
    
    // AD = Admin, all others are employees
    if (dbRole === "AD") {
      return "admin";
    }
    return "employee";
  };

  const handleLogin = async () => {
    if (!userId || !password) {
      setMsg("Enter Credentials");
      setIsSuccess(false);
      return;
    }

    if (isLoggingIn) return;

    setLoading(true);
    setMsg("");
    setIsLoggingIn(true);

    try {
      const res = await axios.post(API_URL, {
        uid: userId.trim(),
        pwd: password.trim()
      });

      console.log("Login response:", res.data);
      console.log("Database role:", res.data.role);

      if (res.data && res.data.id) {
        setMsg("Login Successful");
        setIsSuccess(true);

        const profileImageUrl = `${API_BASE}/api/profile/image/${res.data.id}?t=${Date.now()}`;
        
        // Convert role from database format (AD, EN, etc.) to app format (admin, employee)
        const appRole = convertRole(res.data.role);
        console.log("Converted app role:", appRole);
        
        const userData = {
          id: res.data.id,
          name: res.data.name || "Employee",
          role: appRole,
          email: res.data.email || "",
          phone: res.data.phone || "",
          loginTime: new Date().toLocaleString(),
          profile_pic: profileImageUrl,
          profileImage: profileImageUrl,
        };
        
        // Save session data for this login session only
        await AsyncStorage.setItem("userData", JSON.stringify(userData));
        await AsyncStorage.setItem("employeeData", JSON.stringify(userData));

        if (remember) {
          await AsyncStorage.setItem("savedUserId", userId);
          await AsyncStorage.setItem("savedPassword", password);
        }

        setTimeout(() => {
          setLoading(false);
          onLogin(userData);
        }, 1200);

      } else {
        setMsg("Invalid User ID or Password");
        setIsSuccess(false);
        setLoading(false);
        setIsLoggingIn(false);
      }

    } catch (err) {
      console.error("Login error:", err);
      setMsg("Server Error - Check connection");
      setIsSuccess(false);
      setLoading(false);
      setIsLoggingIn(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <StatusBar backgroundColor="#1976d2" barStyle="light-content" translucent={true} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.headerText}>Renew Care</Text>
        </View>

        <View style={styles.body}>
          <Image
            source={require("../images/logo.png")}
            style={styles.logo}
          />

          <Text style={styles.title}>Login</Text>

          {/* User ID Input with Icon */}
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              placeholder="User ID"
              style={styles.input}
              value={userId}
              onChangeText={setUserId}
              editable={!loading}
              placeholderTextColor="#999"
            />
          </View>

          {/* Password Input with Icon */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              placeholder="Password"
              secureTextEntry={!showPassword}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
              placeholderTextColor="#999"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={toggleRemember}
              disabled={loading}
            >
              <View style={[
                styles.checkbox,
                remember && styles.checkedBox
              ]}>
                {remember && (
                  <Ionicons name="checkmark" size={10} color="#fff" />
                )}
              </View>
              <Text style={styles.rememberText}>Remember Me</Text>
            </TouchableOpacity>

            <Text style={styles.forgot}>Forgot Password?</Text>
          </View>

          {msg !== "" && !isSuccess && (
            <Text style={styles.errorMsg}>{msg}</Text>
          )}

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Powered by</Text>
            <Image
              source={require("../images/Company_logo.jpeg")}
              style={styles.footerLogo}
            />
            <Text style={styles.footerText}>DbQuest Business Solutions</Text>
          </View>

          {msg !== "" && isSuccess && (
            <View style={styles.successContainer}>
              <Image
                source={require("../images/logo.png")}
                style={styles.successLogo}
              />
              <Text style={styles.successText}>{msg}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f5f7fa" 
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: "#1976d2",
    paddingTop: 45,
    paddingBottom: 18,
    paddingLeft: 20
  },
  headerText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold"
  },
  body: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
  logo: {
    width: 150,
    height: 190,
    resizeMode: "contain",
    marginBottom: 10,
    marginTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 35,
    color: "#1a237e"
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginTop:20,
    marginBottom: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    paddingVertical: 12,
  },
  eyeIcon: {
    padding: 5,
  },
  row: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
    marginTop: 5
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderColor: "#1976d2",
    borderRadius: 4,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  checkedBox: {
    backgroundColor: "#1976d2",
  },
  rememberText: { 
    fontSize: 13, 
    color: "#666" 
  },
  forgot: { 
    color: "#1976d2", 
    fontSize: 13,
    fontWeight: "500"
  },
  errorMsg: { 
    color: "#ff4444", 
    fontSize: 12, 
    marginBottom: 12,
    textAlign: "center"
  },
  button: {
    width: "100%",
    backgroundColor: "#1976d2",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 15,
    marginBottom: 10
  },
  buttonText: { 
    color: "#fff", 
    fontWeight: "bold", 
    fontSize: 16 
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 15,
  },
  footerLogo: {
    width: 20,
    height: 24,
    marginHorizontal: 6,
    resizeMode: "contain"
  },
  footerText: { 
    color: "#7f7b7b", 
    fontSize: 11,
    fontWeight: "500",
    textAlign:"center",
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 25,
    alignSelf: "center"
  },
  successLogo: {
    width: 20,
    height: 16,
    marginRight: 8,
    resizeMode: "contain"
  },
  successText: { 
    color: "#4CAF50", 
    fontSize: 13, 
    fontWeight: "600" 
  }
});