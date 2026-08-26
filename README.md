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
React Native Mobile Application
## Screenshots

### Mobile Application

#### Login

![Login Screen](./images/Login.jpeg)

#### Dashboard

![Dashboard Screen](./images/Dashboard%20Screen.jpeg)

#### Plant Management

![Plant Screen](./images/Plant%20Screen.jpeg)

#### Create Service

![Create Service](./images/Create%20Service.jpeg)

#### Service Management

![Service Screen](./images/Service%20Screen.jpeg)

### Desktop Application

#### Service Entry

![Service Entry](./images/Service%20Entry.png)

#### Service Report

![Service Report](./images/Service%20Report%20Screen.png)
