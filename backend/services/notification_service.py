"""
Notification Service

Manages user notifications for trade execution, risk events, and system alerts.
Integrates with SSE for real-time updates and email for important events.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from supabase import Client

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Service for creating and managing user notifications.

    Notification Types:
    - trade_executed: Trade completion alerts
    - strategy_started/stopped: Bot state changes
    - risk_event: Risk limit breaches, stop-loss triggers
    - position_closed: Position exit notifications
    - daily_summary: End-of-day performance summary
    - system_announcement: Platform updates and maintenance
    """

    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.logger = logging.getLogger(__name__)

    async def notify_trade_executed(
        self,
        user_id: str,
        trade: Dict[str, Any],
        strategy_name: str
    ):
        """Send notification when a trade is executed"""
        symbol = trade.get('symbol', 'Unknown')
        side = trade.get('type', 'unknown').upper()
        quantity = trade.get('quantity', 0)
        price = trade.get('price', 0)
        profit_loss = trade.get('profit_loss', 0)

        # Determine priority based on trade size
        priority = 'high' if abs(quantity * price) > 10000 else 'normal'

        title = f"Trade Executed: {side} {symbol}"
        message = (
            f"Strategy '{strategy_name}' executed {side} order:\n"
            f"• Symbol: {symbol}\n"
            f"• Quantity: {quantity:.4f}\n"
            f"• Price: ${price:.2f}\n"
        )

        if profit_loss != 0:
            pnl_sign = '+' if profit_loss > 0 else ''
            message += f"• P&L: {pnl_sign}${profit_loss:.2f}\n"

        await self._create_notification(
            user_id=user_id,
            notification_type='trade_executed',
            title=title,
            message=message,
            priority=priority,
            strategy_id=trade.get('strategy_id'),
            trade_id=trade.get('id'),
            metadata={
                'symbol': symbol,
                'side': side,
                'quantity': quantity,
                'price': price,
                'profit_loss': profit_loss
            }
        )

    async def notify_strategy_started(
        self,
        user_id: str,
        strategy_id: str,
        strategy_name: str
    ):
        """Notify user when strategy is activated"""
        title = f"Strategy Started: {strategy_name}"
        message = (
            f"Your strategy '{strategy_name}' is now active and will "
            f"execute trades automatically based on market conditions."
        )

        await self._create_notification(
            user_id=user_id,
            notification_type='strategy_started',
            title=title,
            message=message,
            priority='normal',
            strategy_id=strategy_id
        )

    async def notify_strategy_stopped(
        self,
        user_id: str,
        strategy_id: str,
        strategy_name: str,
        reason: Optional[str] = None
    ):
        """Notify user when strategy is deactivated"""
        title = f"Strategy Stopped: {strategy_name}"
        message = f"Your strategy '{strategy_name}' has been stopped."

        if reason:
            message += f"\n\nReason: {reason}"

        priority = 'high' if reason and 'risk' in reason.lower() else 'normal'

        await self._create_notification(
            user_id=user_id,
            notification_type='strategy_stopped',
            title=title,
            message=message,
            priority=priority,
            strategy_id=strategy_id,
            metadata={'reason': reason} if reason else {}
        )

    async def notify_risk_event(
        self,
        user_id: str,
        strategy_id: str,
        strategy_name: str,
        event_type: str,
        event_data: Dict[str, Any],
        action_taken: Optional[str] = None
    ):
        """Notify user of risk management events"""
        event_messages = {
            'stop_loss_triggered': 'Stop-loss triggered',
            'take_profit_hit': 'Take-profit target reached',
            'max_loss_reached': 'Maximum loss limit reached',
            'position_size_exceeded': 'Position size limit exceeded',
            'daily_loss_limit': 'Daily loss limit reached'
        }

        event_title = event_messages.get(event_type, 'Risk Event')
        title = f"⚠️ {event_title}: {strategy_name}"

        message = f"Risk event detected in strategy '{strategy_name}':\n"
        message += f"• Event: {event_title}\n"

        # Add relevant event data
        if 'symbol' in event_data:
            message += f"• Symbol: {event_data['symbol']}\n"
        if 'current_loss' in event_data:
            message += f"• Current Loss: ${event_data['current_loss']:.2f}\n"
        if 'limit' in event_data:
            message += f"• Limit: ${event_data['limit']:.2f}\n"

        if action_taken:
            message += f"\nAction Taken: {action_taken}"

        await self._create_notification(
            user_id=user_id,
            notification_type='risk_event',
            title=title,
            message=message,
            priority='critical',
            strategy_id=strategy_id,
            metadata={
                'event_type': event_type,
                'event_data': event_data,
                'action_taken': action_taken
            }
        )

    async def notify_position_closed(
        self,
        user_id: str,
        strategy_id: str,
        strategy_name: str,
        position: Dict[str, Any]
    ):
        """Notify user when a position is closed"""
        symbol = position.get('symbol', 'Unknown')
        realized_pnl = position.get('realized_pnl', 0)
        entry_price = position.get('entry_price', 0)
        close_price = position.get('close_price', 0)
        quantity = position.get('quantity', 0)

        pnl_sign = '+' if realized_pnl > 0 else ''
        emoji = '📈' if realized_pnl > 0 else '📉'

        title = f"{emoji} Position Closed: {symbol}"
        message = (
            f"Strategy '{strategy_name}' closed position:\n"
            f"• Symbol: {symbol}\n"
            f"• Quantity: {quantity:.4f}\n"
            f"• Entry: ${entry_price:.2f}\n"
            f"• Exit: ${close_price:.2f}\n"
            f"• P&L: {pnl_sign}${realized_pnl:.2f}\n"
        )

        return_percent = ((close_price - entry_price) / entry_price) * 100
        message += f"• Return: {pnl_sign}{return_percent:.2f}%"

        priority = 'high' if abs(realized_pnl) > 1000 else 'normal'

        await self._create_notification(
            user_id=user_id,
            notification_type='position_closed',
            title=title,
            message=message,
            priority=priority,
            strategy_id=strategy_id,
            metadata={
                'symbol': symbol,
                'realized_pnl': realized_pnl,
                'return_percent': return_percent
            }
        )

    async def notify_daily_summary(
        self,
        user_id: str,
        summary: Dict[str, Any]
    ):
        """Send end-of-day performance summary"""
        total_pnl = summary.get('total_pnl', 0)
        total_trades = summary.get('total_trades', 0)
        winning_trades = summary.get('winning_trades', 0)
        active_strategies = summary.get('active_strategies', 0)

        pnl_sign = '+' if total_pnl > 0 else ''
        emoji = '✅' if total_pnl > 0 else '❌' if total_pnl < 0 else '➖'

        title = f"{emoji} Daily Summary: {pnl_sign}${total_pnl:.2f}"
        message = (
            f"Today's Trading Summary:\n\n"
            f"• Total P&L: {pnl_sign}${total_pnl:.2f}\n"
            f"• Trades Executed: {total_trades}\n"
            f"• Winning Trades: {winning_trades}/{total_trades}\n"
            f"• Active Strategies: {active_strategies}\n"
        )

        if summary.get('best_strategy'):
            message += f"\n🏆 Best Performer: {summary['best_strategy']['name']}"
            message += f" ({pnl_sign}${summary['best_strategy']['pnl']:.2f})"

        await self._create_notification(
            user_id=user_id,
            notification_type='daily_summary',
            title=title,
            message=message,
            priority='low',
            metadata=summary
        )

    async def notify_system_announcement(
        self,
        user_id: str,
        title: str,
        message: str,
        priority: str = 'normal'
    ):
        """Send system announcement to user"""
        await self._create_notification(
            user_id=user_id,
            notification_type='system_announcement',
            title=title,
            message=message,
            priority=priority
        )

    async def _create_notification(
        self,
        user_id: str,
        notification_type: str,
        title: str,
        message: str,
        priority: str = 'normal',
        strategy_id: Optional[str] = None,
        trade_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Create notification record in database"""
        try:
            # Check user notification preferences
            preferences = await self._get_user_preferences(user_id)

            if not preferences.get('notifications_enabled', True):
                return  # User has notifications disabled

            notification = {
                'user_id': user_id,
                'type': notification_type,
                'title': title,
                'message': message,
                'priority': priority,
                'strategy_id': strategy_id,
                'trade_id': trade_id,
                'metadata': metadata or {},
                'is_read': False
            }

            result = self.supabase.table('user_notifications').insert(
                notification
            ).execute()

            notification_id = result.data[0]['id']

            self.logger.info(
                f"📬 Notification created: {notification_type} for user {user_id}"
            )

            # Trigger SSE broadcast for real-time update
            await self._broadcast_notification(user_id, result.data[0])

            # Send email for critical notifications
            if priority == 'critical' and preferences.get('email_notifications', True):
                await self._send_email_notification(user_id, notification)

            return notification_id

        except Exception as e:
            self.logger.error(f"❌ Failed to create notification: {e}", exc_info=True)
            return None

    async def _get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Get user notification preferences"""
        try:
            result = self.supabase.table('user_profiles').select(
                'notifications_enabled, email_notifications, push_notifications'
            ).eq('user_id', user_id).single().execute()

            return result.data if result.data else {}
        except Exception as e:
            self.logger.error(f"Error fetching user preferences: {e}")
            return {}

    async def _broadcast_notification(
        self,
        user_id: str,
        notification: Dict[str, Any]
    ):
        """Broadcast notification via SSE"""
        try:
            from sse_manager import publish

            await publish(user_id, {
                'type': 'notification',
                'notification': notification
            })

            self.logger.debug(f"📡 Broadcasted notification to user {user_id}")
        except Exception as e:
            self.logger.error(f"Error broadcasting notification: {e}")

    async def _send_email_notification(
        self,
        user_id: str,
        notification: Dict[str, Any]
    ):
        """Send email notification for critical events"""
        # TODO: Implement email sending via SendGrid, Resend, or similar
        self.logger.info(
            f"📧 Email notification queued for user {user_id}: "
            f"{notification['title']}"
        )

    async def mark_as_read(self, user_id: str, notification_id: str):
        """Mark notification as read"""
        try:
            self.supabase.table('user_notifications').update({
                'is_read': True,
                'read_at': datetime.now(timezone.utc).isoformat()
            }).eq('id', notification_id).eq('user_id', user_id).execute()

            self.logger.debug(f"Notification {notification_id} marked as read")
        except Exception as e:
            self.logger.error(f"Error marking notification as read: {e}")

    async def mark_all_as_read(self, user_id: str):
        """Mark all notifications as read for a user"""
        try:
            self.supabase.table('user_notifications').update({
                'is_read': True,
                'read_at': datetime.now(timezone.utc).isoformat()
            }).eq('user_id', user_id).eq('is_read', False).execute()

            self.logger.info(f"All notifications marked as read for user {user_id}")
        except Exception as e:
            self.logger.error(f"Error marking all notifications as read: {e}")

    async def get_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications"""
        try:
            result = self.supabase.table('user_notifications').select(
                'id', count='exact'
            ).eq('user_id', user_id).eq('is_read', False).execute()

            return result.count or 0
        except Exception as e:
            self.logger.error(f"Error getting unread count: {e}")
            return 0

    async def get_recent_notifications(
        self,
        user_id: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get recent notifications for a user"""
        try:
            result = self.supabase.table('user_notifications').select(
                '*'
            ).eq('user_id', user_id).order(
                'created_at', desc=True
            ).limit(limit).execute()

            return result.data or []
        except Exception as e:
            self.logger.error(f"Error getting recent notifications: {e}")
            return []

    async def delete_notification(self, user_id: str, notification_id: str):
        """Delete a notification"""
        try:
            self.supabase.table('user_notifications').delete().eq(
                'id', notification_id
            ).eq('user_id', user_id).execute()

            self.logger.debug(f"Notification {notification_id} deleted")
        except Exception as e:
            self.logger.error(f"Error deleting notification: {e}")
