---
title: "Proposal"
weight: 2
pre: "2. "
---

## Building a Phone-Store E-Commerce Application on AWS

A project proposal for a phone-store application with customer and administrator workflows. The plan combines a React interface, a Spring Boot API and a MySQL database, deployed as separate components on AWS.

### 1. Executive Summary

Customers can browse and search for phones, create an account, sign in and place orders. Administrators can manage the product list, images, orders and user data. Hosting on AWS provides hands-on practice with a realistic deployment and integration workflow.

### 2. Problem Statement

An application that only runs locally makes it hard to evaluate internet access, connectivity between services, security boundaries and operational monitoring. The proposed deployment creates a shared environment to validate these concerns.

- ReactJS presents the interface for customers and administrators.
- Spring Boot handles business logic and API requests.
- MySQL stores products, accounts and order data.
- Amazon Cognito supports authentication; CloudWatch provides operational observability.

### 3. Solution Architecture

The browser receives the frontend and product images through CloudFront from S3. Application requests are routed to Spring Boot on EC2, which then connects to MySQL on RDS. Cognito handles sign-in, and CloudWatch collects health metrics and logs.

#### AWS Services Used

| Service | Planned purpose |
|---|---|
| Amazon VPC | Network boundary for the application and database |
| AWS IAM | Resource permissions and role-based access |
| Amazon EC2 | Runs the Spring Boot application and APIs |
| Amazon RDS | Managed MySQL database |
| Amazon S3 | Stores the built frontend and product images |
| Amazon CloudFront | Delivers frontend assets and routes requests |
| Amazon Cognito | User registration, sign-in and token issuance |
| Amazon CloudWatch | Metrics, logs and service monitoring |

#### Component Design

- **Frontend:** ReactJS, HTML, CSS, JavaScript and Bootstrap; the production build is stored in S3.
- **Application server:** Spring Boot on a single EC2 instance; API traffic is routed through CloudFront.
- **Database:** MySQL on RDS in a private subnet, reachable only from the application server; the workshop plan uses a Single-AZ instance.
- **Images:** Stored in S3 and delivered through CloudFront; the application is granted access through an appropriate role.
- **Authentication and monitoring:** Cognito issues tokens for protected operations; CloudWatch tracks instance metrics and application logs.

### 4. Technical Implementation

1. Confirm customer and administrator requirements, data flows and application scope.
2. Design the React interface, the MySQL schema and the Spring Boot APIs.
3. Configure IAM, the VPC network, security groups, EC2, RDS, S3, CloudFront, Cognito and CloudWatch.
4. Deploy the frontend and backend, connect the database and integrate authentication.
5. Test product browsing, sign-in, product management, ordering, database access and logs.

#### Team Responsibilities

- UI design, customer/administrator interfaces and API integration.
- AWS access, networking, compute, database, storage, delivery and monitoring.
- Database design, MySQL administration, data preparation and API testing.
- Spring Boot service and REST API development.
- Cognito integration, token validation and authorization.

### 5. Timeline and Milestones

- Analysis and design: requirements, interface plan, database schema and architecture.
- Application development: frontend, backend, database and authentication.
- Infrastructure preparation: networking, permissions, compute, database and storage.
- Deployment and integration: put the components on the system and verify connectivity between them.
- Testing and finalization: confirm functionality, authentication, logs, metrics and documentation.

### 6. Budget Estimation

Estimates are for one month; actual costs depend on the Region, usage and current AWS pricing.

| Resource | Estimated monthly cost (USD) |
|---|---|
| EC2 and EBS | 21.19 |
| RDS MySQL and storage | 21.01 |
| S3 | 0.18 |
| CloudFront | 0.00 |
| Cognito | 0.00 |
| CloudWatch | 0.00 |
| Public IPv4 address | 3.65 |
| IAM and VPC | 0.00 |
| **Estimated total** | **46.03** |

### 7. Risk Assessment

| Risk | Impact | Probability |
|---|---|---|
| Network or permission errors interrupt connectivity | High | Medium |
| Application server or database interruption | Medium | Medium |
| Incorrect authentication or authorization configuration | High | Medium |
| Actual cost exceeds the estimate or the available credits | Medium | Medium |

#### Mitigation and Contingency Plan

- Verify network rules and resource permissions in small steps; allow only the application server to reach the database.
- Test each deployment phase and use CloudWatch logs and metrics to diagnose issues.
- Verify token validation and customer/administrator access rules.
- Monitor costs and delete resources when they are no longer needed.
- Keep the source code and important database backups so the workshop environment can be restored.

### 8. Expected Outcomes

- A testable phone-store application for customers and administrators.
- A React frontend, Spring Boot service and MySQL database deployed end to end.
- Cognito-based registration, sign-in and authorization.
- Verified product browsing, administration, ordering and data storage.
- Operational logs, service metrics, architecture notes, deployment steps and resource cleanup instructions.
