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

## Technology Stack

| Category | Technology |
|----------|------------|
| Mobile Application | React Native |
| Desktop Application | PowerBuilder |
| Backend | Spring Boot |
| APIs | REST APIs |
| Database | SQL Server |
| API Testing | Postman |
| Mobile Runtime | Expo Go |

## Key Features

### Authentication
- User authentication
- Role-based access for Admin and Technician

### Plant Management
- Plant information management
- Plant and equipment association

### Equipment Management
- Equipment information management
- Equipment tracking

### Service Request Management
- Service request creation
- Service request tracking
- Technician assignment

### Service Execution
- Assigned service viewing
- Maintenance activity updates
- Service status updates

### Parts Management
- Spare-parts management
- Parts usage tracking
- Quantity and cost management

## Screenshots

### Mobile Application

#### Login
<img src="./images/Login.jpeg" alt="Login Screen" width="300">

#### Dashboard
<img src="./images/Dashboard%20Screen.jpeg" alt="Dashboard Screen" width="300">

#### Plant Management
<img src="./images/Plant%20Screen.jpeg" alt="Plant Screen" width="300">

#### Create Service
<img src="./images/Create%20Service.jpeg" alt="Create Service" width="300">

#### Service Management
<img src="./images/Service%20Screen.jpeg" alt="Service Screen" width="300">

### Desktop Application

#### Service Entry
<img src="./images/Service%20Entry.png" alt="Service Entry" width="800">

#### Service Report
<img src="./images/Service%20Report%20Screen.png" alt="Service Report" width="800">
## System Architecture

```text
Desktop Application
       |
       | REST APIs
       v
Spring Boot Backend
       |
       v
SQL Server Database
       ^
       |
       | REST APIs
       |


![Service Report](./images/Service%20Report%20Screen.png)
