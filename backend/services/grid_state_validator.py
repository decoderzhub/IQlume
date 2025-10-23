"""
Grid State Validator

Validates grid order coverage and detects gaps in grid order placement.
Ensures all grid levels maintain appropriate order coverage.
"""

import logging
from typing import Dict, Any, List, Set, Tuple
from datetime import datetime, timezone
from supabase import Client

logger = logging.getLogger(__name__)


class GridStateValidator:
    """Validates and maintains grid order integrity"""

    def __init__(self, supabase: Client):
        self.supabase = supabase

    async def validate_strategy_grid(
        self,
        strategy_id: str,
        strategy_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate grid order coverage for a strategy

        Returns:
            Dict with validation results including gaps detected and recommendations
        """
        try:
            config = strategy_data.get("configuration", {})
            lower_price = config.get("price_range_lower", 0)
            upper_price = config.get("price_range_upper", 0)
            num_grids = config.get("number_of_grids", 10)
            grid_mode = strategy_data.get("grid_mode", "arithmetic")

            if lower_price == 0 or upper_price == 0:
                return {
                    "valid": False,
                    "reason": "Invalid grid range configuration"
                }

            # Calculate expected grid levels
            grid_levels = self._calculate_grid_levels(
                lower_price, upper_price, num_grids, grid_mode
            )

            # Get existing grid orders
            existing_orders = await self._get_existing_orders(strategy_id)

            # Analyze coverage
            coverage = self._analyze_coverage(grid_levels, existing_orders)

            # Detect gaps
            gaps = self._detect_gaps(grid_levels, existing_orders, coverage)

            # Calculate statistics
            stats = {
                "total_grid_levels": len(grid_levels),
                "covered_levels": len(coverage["covered_levels"]),
                "missing_levels": len(coverage["missing_levels"]),
                "coverage_percent": (len(coverage["covered_levels"]) / len(grid_levels)) * 100,
                "gaps_detected": len(gaps),
                "total_active_orders": len([o for o in existing_orders.values() if o["status"] in ["pending", "partially_filled"]]),
                "stale_orders": len([o for o in existing_orders.values() if o.get("is_stale", False)])
            }

            result = {
                "valid": stats["coverage_percent"] > 50,  # Consider valid if >50% covered
                "strategy_id": strategy_id,
                "strategy_name": strategy_data.get("name", "Unknown"),
                "grid_levels": grid_levels,
                "coverage": coverage,
                "gaps": gaps,
                "statistics": stats,
                "recommendations": self._generate_recommendations(stats, gaps),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

            logger.info(
                f"📊 [{strategy_data.get('name', 'Unknown')}] "
                f"Coverage: {stats['coverage_percent']:.1f}% "
                f"({stats['covered_levels']}/{stats['total_grid_levels']} levels), "
                f"Gaps: {stats['gaps_detected']}"
            )

            return result

        except Exception as e:
            logger.error(f"❌ Error validating grid state: {e}", exc_info=True)
            return {
                "valid": False,
                "reason": f"Validation error: {str(e)}"
            }

    def _calculate_grid_levels(
        self,
        lower_price: float,
        upper_price: float,
        num_grids: int,
        grid_mode: str = "arithmetic"
    ) -> List[float]:
        """Calculate grid price levels"""
        levels = []

        if grid_mode == "geometric":
            ratio = (upper_price / lower_price) ** (1 / (num_grids - 1))
            for i in range(num_grids):
                levels.append(lower_price * (ratio ** i))
        else:
            step = (upper_price - lower_price) / (num_grids - 1)
            for i in range(num_grids):
                levels.append(lower_price + step * i)

        return levels

    async def _get_existing_orders(self, strategy_id: str) -> Dict[int, Dict[str, Any]]:
        """Get all grid orders for a strategy"""
        try:
            resp = self.supabase.table("grid_orders").select("*").eq(
                "strategy_id", strategy_id
            ).execute()

            orders_map = {}
            for order in (resp.data or []):
                grid_level = order.get("grid_level")
                if grid_level is not None:
                    # Keep the most recent order if multiple exist at same level
                    if grid_level not in orders_map or order.get("created_at") > orders_map[grid_level].get("created_at"):
                        orders_map[grid_level] = order

            return orders_map

        except Exception as e:
            logger.error(f"❌ Error getting existing orders: {e}")
            return {}

    def _analyze_coverage(
        self,
        grid_levels: List[float],
        existing_orders: Dict[int, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze order coverage across grid levels"""
        covered_levels = set()
        missing_levels = set()

        for level_index in range(len(grid_levels)):
            if level_index in existing_orders:
                order = existing_orders[level_index]
                # Only count as covered if order is active (not stale, not cancelled)
                if order["status"] in ["pending", "partially_filled", "filled"] and not order.get("is_stale", False):
                    covered_levels.add(level_index)
                else:
                    missing_levels.add(level_index)
            else:
                missing_levels.add(level_index)

        return {
            "covered_levels": sorted(list(covered_levels)),
            "missing_levels": sorted(list(missing_levels))
        }

    def _detect_gaps(
        self,
        grid_levels: List[float],
        existing_orders: Dict[int, Dict[str, Any]],
        coverage: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Detect gaps in grid order placement"""
        gaps = []
        missing_levels = coverage["missing_levels"]

        if not missing_levels:
            return gaps

        # Group consecutive missing levels into gap ranges
        current_gap_start = None
        current_gap_end = None

        for level_index in missing_levels:
            if current_gap_start is None:
                current_gap_start = level_index
                current_gap_end = level_index
            elif level_index == current_gap_end + 1:
                # Extend current gap
                current_gap_end = level_index
            else:
                # Save current gap and start new one
                gaps.append({
                    "start_level": current_gap_start,
                    "end_level": current_gap_end,
                    "start_price": grid_levels[current_gap_start],
                    "end_price": grid_levels[current_gap_end],
                    "num_missing_levels": current_gap_end - current_gap_start + 1
                })
                current_gap_start = level_index
                current_gap_end = level_index

        # Add final gap
        if current_gap_start is not None:
            gaps.append({
                "start_level": current_gap_start,
                "end_level": current_gap_end,
                "start_price": grid_levels[current_gap_start],
                "end_price": grid_levels[current_gap_end],
                "num_missing_levels": current_gap_end - current_gap_start + 1
            })

        return gaps

    def _generate_recommendations(
        self,
        stats: Dict[str, Any],
        gaps: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate recommendations based on validation results"""
        recommendations = []

        if stats["coverage_percent"] < 30:
            recommendations.append("⚠️ Critical: Less than 30% grid coverage. Consider restarting the grid strategy.")

        if stats["coverage_percent"] < 60:
            recommendations.append("⚠️ Low grid coverage. Grid Price Monitor will automatically fill gaps.")

        if stats["gaps_detected"] > 5:
            recommendations.append(f"⚠️ Multiple gaps detected ({stats['gaps_detected']}). Price Monitor will address them systematically.")

        if stats["stale_orders"] > 0:
            recommendations.append(f"ℹ️ {stats['stale_orders']} stale orders detected. Consider cleaning up stale orders.")

        if stats["coverage_percent"] >= 90:
            recommendations.append("✅ Excellent grid coverage. Strategy is performing optimally.")

        # Add gap-specific recommendations
        for gap in gaps:
            if gap["num_missing_levels"] > 3:
                recommendations.append(
                    f"🎯 Large gap at levels {gap['start_level']}-{gap['end_level']} "
                    f"(${gap['start_price']:.2f}-${gap['end_price']:.2f})"
                )

        return recommendations

    async def cleanup_stale_orders(self, strategy_id: str) -> int:
        """
        Clean up stale orders for a strategy

        Returns:
            Number of orders cleaned up
        """
        try:
            # Get all stale orders
            resp = self.supabase.table("grid_orders").select("id").eq(
                "strategy_id", strategy_id
            ).eq(
                "is_stale", True
            ).execute()

            if not resp.data:
                return 0

            stale_order_ids = [order["id"] for order in resp.data]

            # Mark as cancelled (don't delete to maintain history)
            update_resp = self.supabase.table("grid_orders").update({
                "status": "cancelled",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).in_(
                "id", stale_order_ids
            ).execute()

            cleaned_count = len(stale_order_ids)
            logger.info(f"🧹 Cleaned up {cleaned_count} stale orders for strategy {strategy_id}")

            return cleaned_count

        except Exception as e:
            logger.error(f"❌ Error cleaning up stale orders: {e}", exc_info=True)
            return 0

    async def get_grid_health_score(
        self,
        strategy_id: str,
        strategy_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate overall health score for a grid strategy

        Returns:
            Dict with health score (0-100) and breakdown
        """
        try:
            validation = await self.validate_strategy_grid(strategy_id, strategy_data)

            if not validation.get("valid", False):
                return {
                    "health_score": 0,
                    "status": "unhealthy",
                    "reason": validation.get("reason", "Unknown error")
                }

            stats = validation["statistics"]

            # Calculate component scores
            coverage_score = stats["coverage_percent"]
            gap_penalty = min(stats["gaps_detected"] * 5, 30)  # Max 30 point penalty
            stale_penalty = min(stats["stale_orders"] * 2, 20)  # Max 20 point penalty

            # Calculate overall health score
            health_score = max(0, coverage_score - gap_penalty - stale_penalty)

            # Determine status
            if health_score >= 80:
                status = "excellent"
            elif health_score >= 60:
                status = "good"
            elif health_score >= 40:
                status = "fair"
            elif health_score >= 20:
                status = "poor"
            else:
                status = "critical"

            return {
                "health_score": round(health_score, 1),
                "status": status,
                "breakdown": {
                    "coverage_score": round(coverage_score, 1),
                    "gap_penalty": gap_penalty,
                    "stale_penalty": stale_penalty
                },
                "statistics": stats,
                "recommendations": validation["recommendations"]
            }

        except Exception as e:
            logger.error(f"❌ Error calculating health score: {e}", exc_info=True)
            return {
                "health_score": 0,
                "status": "error",
                "reason": str(e)
            }


# Global instance factory
def create_grid_state_validator(supabase: Client) -> GridStateValidator:
    return GridStateValidator(supabase)
