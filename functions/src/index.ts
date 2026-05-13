import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp()

/**
 * Keep-alive function (replaces Supabase Edge Function)
 * Runs every 5 minutes to keep the database active
 */
export const keepAlive = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    console.log('Keep-alive function executed at', new Date().toISOString())
    
    try {
      // Write a heartbeat document to Firestore
      await admin.firestore().collection('heartbeat').add({
        serviceName: 'keep-alive',
        status: 'healthy',
        lastPing: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'production'
        }
      })
      
      console.log('Heartbeat written successfully')
      return null
    } catch (error) {
      console.error('Error in keep-alive function:', error)
      throw error
    }
  })

/**
 * SMS Dispatcher (replaces Supabase Edge Function)
 * HTTP endpoint for sending SMS messages
 */
export const smsDispatcher = functions.https.onRequest(async (req, res) => {
  // CORS handling
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  
  try {
    const { phone, message, provider } = req.body
    
    if (!phone || !message) {
      res.status(400).json({ error: 'Phone and message are required' })
      return
    }
    
    // TODO: Implement SMS sending logic based on provider
    // This is a placeholder - implement your SMS provider integration here
    console.log('SMS request:', { phone, message, provider })
    
    // Log the SMS attempt
    await admin.firestore().collection('smsLogs').add({
      phone,
      message,
      provider: provider || 'default',
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })
    
    res.json({ success: true, message: 'SMS queued for sending' })
  } catch (error) {
    console.error('Error in SMS dispatcher:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Scheduled Exports (replaces Supabase Edge Function)
 * Runs daily to generate and export reports
 */
export const scheduledExports = functions.pubsub
  .schedule('every day 02:00')
  .timeZone('Africa/Accra')
  .onRun(async (context) => {
    console.log('Scheduled exports function executed at', new Date().toISOString())
    
    try {
      // TODO: Implement export logic
      // This is a placeholder - implement your export logic here
      
      // Example: Get all attendance records from yesterday
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)
      
      const snapshot = await admin.firestore()
        .collection('attendance')
        .where('serviceDate', '==', yesterday.toISOString().split('T')[0])
        .get()
      
      console.log(`Found ${snapshot.size} attendance records for export`)
      
      // Log the export job
      await admin.firestore().collection('exportJobs').add({
        type: 'daily_attendance',
        date: yesterday.toISOString().split('T')[0],
        recordCount: snapshot.size,
        status: 'completed',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })
      
      return null
    } catch (error) {
      console.error('Error in scheduled exports:', error)
      throw error
    }
  })
