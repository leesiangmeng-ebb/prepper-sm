"""add_tasting_tables

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2024-12-18

Plan 05: Tasting Notes
- tasting_sessions table for tasting events
- tasting_notes table for per-recipe feedback
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6g7h8'
down_revision: Union[str, None] = 'b2c3d4e5f6g7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -------------------------------------------------------------------------
    # 1. Tasting Sessions table
    # -------------------------------------------------------------------------
    op.create_table(
        'tasting_sessions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('location', sa.String(200), nullable=True),
        sa.Column('attendees', sa.JSON(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_tasting_sessions_date', 'tasting_sessions', ['date'])
    op.create_index('ix_tasting_sessions_name', 'tasting_sessions', ['name'])

    # -------------------------------------------------------------------------
    # 2. Tasting Notes table
    # -------------------------------------------------------------------------
    op.create_table(
        'tasting_notes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('session_id', sa.Integer(), sa.ForeignKey('tasting_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('recipe_id', sa.Integer(), sa.ForeignKey('recipes.id', ondelete='CASCADE'), nullable=False),
        # Ratings (1-5)
        sa.Column('taste_rating', sa.Integer(), nullable=True),
        sa.Column('presentation_rating', sa.Integer(), nullable=True),
        sa.Column('texture_rating', sa.Integer(), nullable=True),
        sa.Column('overall_rating', sa.Integer(), nullable=True),
        # Feedback
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('action_items', sa.Text(), nullable=True),
        sa.Column('decision', sa.String(20), nullable=True),
        sa.Column('taster_name', sa.String(100), nullable=True),
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_tasting_notes_session_id', 'tasting_notes', ['session_id'])
    op.create_index('ix_tasting_notes_recipe_id', 'tasting_notes', ['recipe_id'])

    # Check constraints for ratings (1-5 range)
    op.create_check_constraint(
        'ck_tasting_notes_taste_rating',
        'tasting_notes',
        'taste_rating >= 1 AND taste_rating <= 5'
    )
    op.create_check_constraint(
        'ck_tasting_notes_presentation_rating',
        'tasting_notes',
        'presentation_rating >= 1 AND presentation_rating <= 5'
    )
    op.create_check_constraint(
        'ck_tasting_notes_texture_rating',
        'tasting_notes',
        'texture_rating >= 1 AND texture_rating <= 5'
    )
    op.create_check_constraint(
        'ck_tasting_notes_overall_rating',
        'tasting_notes',
        'overall_rating >= 1 AND overall_rating <= 5'
    )

    # Check constraint for decision values
    op.create_check_constraint(
        'ck_tasting_notes_decision',
        'tasting_notes',
        "decision IS NULL OR decision IN ('approved', 'needs_work', 'rejected')"
    )


def downgrade() -> None:
    # Drop check constraints
    op.drop_constraint('ck_tasting_notes_decision', 'tasting_notes', type_='check')
    op.drop_constraint('ck_tasting_notes_overall_rating', 'tasting_notes', type_='check')
    op.drop_constraint('ck_tasting_notes_texture_rating', 'tasting_notes', type_='check')
    op.drop_constraint('ck_tasting_notes_presentation_rating', 'tasting_notes', type_='check')
    op.drop_constraint('ck_tasting_notes_taste_rating', 'tasting_notes', type_='check')

    # Drop indexes and tables
    op.drop_index('ix_tasting_notes_recipe_id', table_name='tasting_notes')
    op.drop_index('ix_tasting_notes_session_id', table_name='tasting_notes')
    op.drop_table('tasting_notes')

    op.drop_index('ix_tasting_sessions_name', table_name='tasting_sessions')
    op.drop_index('ix_tasting_sessions_date', table_name='tasting_sessions')
    op.drop_table('tasting_sessions')
