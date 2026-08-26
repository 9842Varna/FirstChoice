# RenewCare

## Multi-Platform Maintenance Management System

## About the Project

RenewCare is a multi-platform maintenance management system designed
to streamline industrial equipment monitoring and service operations.

The system integrates a desktop application and a React Native mobile
application through Spring Boot REST APIs, with SQL Server as the
centralized database.

## Project Objective

The objective of RenewCare is to improve maintenance operations by
providing centralized equipment management, service tracking, and
real-time maintenance updates.

The system helps reduce manual effort, improve workflow efficiency,
and enables technicians to access and update maintenance information
directly from the field.

## Technology Stack

| Category | Technology |
|----------|------------|
| Mobile Application | React Native |
| Programming Language | JavaScript |
| Desktop Application | PowerBuilder |
| Backend | Spring Boot |
| APIs | REST APIs |
| Database | SQL Server Management Studio |
| API Testing | Postman |
| Mobile Runtime | Expo Go |
| Development Tool | Visual Studio Code |

## Key Features

### Authentication

- User authentication
- Role-based access for Admin and Technician

### Plant Management

- Plant information management
- Plant and equipment association
- Plant details and status management

### Equipment Management

- Equipment information management
- Equipment tracking
- Equipment details and specifications

### Service Request Management

- Service request creation
- Service request tracking
- Technician assignment
- Equipment-related issue management

### Service Execution

- Assigned service viewing
- Maintenance activity updates
- Service status updates
- Service details recording
- Pending and completed service tracking

### Parts Management

- Spare-parts management
- Parts usage tracking
- Quantity management
- Cost management

## Screenshots

### Mobile Application

<p align="center">
  <strong>Login</strong>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <strong>Dashboard</strong>
</p>

<p align="center">
  <img src="./images/Login.jpeg" alt="Login Screen" width="250">
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="./images/Dashboard%20Screen.jpeg" alt="Dashboard Screen" width="250">
</p>

<br>

<p align="center">
  <strong>Plant Management</strong>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <strong>Create Service</strong>
</p>

<p align="center">
  <img src="./images/Plant%20Screen.jpeg" alt="Plant Screen" width="250">
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="./images/Create%20Service.jpeg" alt="Create Service" width="250">
</p>

<br>

<p align="center">
  <strong>Service Management</strong>
</p>

<p align="center">
  <img src="./images/Service%20Screen.jpeg" alt="Service Management" width="250">
</p>

### Desktop Application

<p align="center">
  <strong>Service Entry</strong>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <strong>Service Report</strong>
</p>

<p align="center">
  <img src="./images/Service%20Entry.png" alt="Service Entry" width="500">
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="./images/Service%20Report%20Screen.png" alt="Service Report" width="500">
</p>
## System Architecture

```text
+---------------------------+
|   Desktop Application     |
|       PowerBuilder        |
+-------------+-------------+
              |
              | REST APIs
              v
+---------------------------+
|      Spring Boot          |
|        Backend            |
+-------------+-------------+
              |
              | Database Connection
              v
+---------------------------+
|       SQL Server          |
|   Centralized Database    |
+-------------+-------------+
              ^
              |
              | REST APIs
              |
+-------------+-------------+
|  React Native Mobile App  |
|         Expo Go           |
+---------------------------+
