# Claude Rules for GenieAI Development

## 🎯 Core Development Rules

### **1. Code Quality & Standards**
- Always write clean, readable, and well-documented code
- Use TypeScript with strict typing
- Follow React Native best practices
- Implement proper error handling with try-catch blocks
- Use meaningful variable and function names
- Add console.log statements for debugging

### **2. Supabase Integration**
- Always use the service role key for server-side operations
- Implement proper RLS (Row Level Security) policies
- Use proper error handling for database operations
- Always check for existing data before inserting
- Use transactions for related operations

### **3. AI Function Development**
- Always include comprehensive error handling
- Implement retry logic for API calls
- Use proper JSON schema validation
- Include fallback mechanisms for AI failures
- Log all important operations for debugging

### **4. User Experience**
- Always provide loading states for async operations
- Implement proper error messages for users
- Use optimistic updates where appropriate
- Ensure smooth navigation flows
- Handle edge cases gracefully

### **5. Performance**
- Optimize API calls and reduce unnecessary requests
- Use proper caching strategies
- Implement efficient state management
- Minimize bundle size and loading times
- Use proper image optimization

## 🚀 Specific Project Rules

### **6. Goal Management**
- Always validate goal data before saving
- Implement proper goal status transitions
- Handle goal approval workflows correctly
- Ensure proper task generation timing
- Maintain goal progress tracking

### **7. Task Generation**
- Always use device timezone for task scheduling
- Implement smart time conflict resolution
- Respect user's preferred time ranges
- Generate unique, descriptive task titles
- Ensure tasks are progressive and valuable

### **8. Push Notifications**
- Always check user notification preferences
- Implement proper token management
- Handle notification failures gracefully
- Use appropriate notification timing
- Provide clear notification content

### **9. Data Consistency**
- Always maintain data integrity
- Use proper foreign key relationships
- Implement proper data validation
- Handle concurrent operations safely
- Maintain audit trails where needed

### **10. Security**
- Always validate user input
- Implement proper authentication checks
- Use secure API endpoints
- Handle sensitive data properly
- Implement proper access controls

## 📱 React Native Specific Rules

### **11. Component Development**
- Use functional components with hooks
- Implement proper prop types
- Use custom hooks for reusable logic
- Implement proper state management
- Use proper styling with StyleSheet

### **12. Navigation**
- Implement proper navigation flows
- Handle deep linking correctly
- Use proper navigation state management
- Implement proper back button handling
- Use proper screen transitions

### **13. Performance Optimization**
- Use FlatList for large lists
- Implement proper image optimization
- Use proper memory management
- Implement proper cleanup in useEffect
- Use proper animation optimization

## 🔧 Development Workflow

### **14. Code Organization**
- Use proper folder structure
- Implement proper component separation
- Use proper import/export patterns
- Implement proper type definitions
- Use proper configuration management

### **15. Testing & Debugging**
- Always test edge cases
- Implement proper error logging
- Use proper debugging tools
- Test on different devices
- Implement proper error boundaries

## 🎨 UI/UX Rules

### **16. Design Consistency**
- Use consistent color schemes
- Implement proper spacing
- Use consistent typography
- Implement proper accessibility
- Use consistent component patterns

### **17. User Feedback**
- Always provide loading indicators
- Implement proper success/error messages
- Use proper confirmation dialogs
- Implement proper form validation
- Use proper progress indicators

## 🚀 Deployment Rules

### **18. Function Deployment**
- Always test functions locally first
- Use proper environment variables
- Implement proper error handling
- Use proper logging
- Test all edge cases

### **19. Database Management**
- Always backup before migrations
- Use proper migration scripts
- Implement proper rollback procedures
- Test all database operations
- Use proper indexing

### **20. Monitoring & Maintenance**
- Implement proper error monitoring
- Use proper performance monitoring
- Implement proper logging
- Use proper alerting
- Implement proper maintenance procedures

## 🎯 Project-Specific Rules

### **21. GenieAI Specific**
- Always prioritize user experience
- Implement proper goal tracking
- Use proper AI integration
- Implement proper task management
- Use proper progress tracking

### **22. AI Integration**
- Always implement proper AI prompts
- Use proper AI response handling
- Implement proper AI error handling
- Use proper AI optimization
- Implement proper AI fallbacks

### **23. Task Management**
- Always implement proper task scheduling
- Use proper task prioritization
- Implement proper task completion tracking
- Use proper task notifications
- Implement proper task analytics

### **24. User Management**
- Always implement proper user authentication
- Use proper user data management
- Implement proper user preferences
- Use proper user analytics
- Implement proper user support

### **25. Performance & Scalability**
- Always implement proper caching
- Use proper database optimization
- Implement proper API optimization
- Use proper image optimization
- Implement proper code splitting

## 🔍 Quality Assurance

### **26. Code Review**
- Always review code before deployment
- Check for security vulnerabilities
- Verify proper error handling
- Test all functionality
- Ensure proper documentation

### **27. Testing**
- Always test on multiple devices
- Test all user flows
- Test error scenarios
- Test performance
- Test accessibility

### **28. Documentation**
- Always document complex logic
- Use proper code comments
- Document API endpoints
- Document database schema
- Document deployment procedures

## 🚨 Emergency Procedures

### **29. Error Handling**
- Always implement proper error boundaries
- Use proper error logging
- Implement proper error recovery
- Use proper error notifications
- Implement proper error monitoring

### **30. Rollback Procedures**
- Always have rollback plans
- Test rollback procedures
- Document rollback steps
- Implement proper backup strategies
- Use proper version control

---

**Remember: These rules are designed to ensure high-quality, maintainable, and scalable code for the GenieAI project. Always prioritize user experience, data integrity, and system reliability.**
