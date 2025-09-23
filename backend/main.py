        
    try:
        await publish(user_id, update_data)
        logger.info(f"📡 Broadcasted trading update to user {user_id}: {update_data.get('type', 'unknown')}")
    except Exception as e:
        logger.error(f"❌ Error broadcasting trading update to user {user_id}: {e}")

# Export for use in other modules
app.broadcast_trading_update = broadcast_trading_update

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)