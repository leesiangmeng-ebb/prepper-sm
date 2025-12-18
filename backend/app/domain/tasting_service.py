"""Tasting session and note management operations."""

from datetime import datetime
from typing import Optional

from sqlmodel import Session, select

from app.models import (
    TastingSession,
    TastingSessionCreate,
    TastingSessionUpdate,
    TastingNote,
    TastingNoteCreate,
    TastingNoteUpdate,
    TastingNoteWithRecipe,
    RecipeTastingSummary,
    Recipe,
)


class TastingService:
    """Service for tasting session and note management."""

    def __init__(self, session: Session):
        self.session = session

    # -------------------------------------------------------------------------
    # Tasting Session Operations
    # -------------------------------------------------------------------------

    def create_session(self, data: TastingSessionCreate) -> TastingSession:
        """Create a new tasting session."""
        tasting_session = TastingSession.model_validate(data)
        self.session.add(tasting_session)
        self.session.commit()
        self.session.refresh(tasting_session)
        return tasting_session

    def list_sessions(
        self,
        limit: int = 50,
        offset: int = 0,
    ) -> list[TastingSession]:
        """List all tasting sessions, ordered by date descending."""
        statement = (
            select(TastingSession)
            .order_by(TastingSession.date.desc(), TastingSession.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(self.session.exec(statement).all())

    def get_session(self, session_id: int) -> Optional[TastingSession]:
        """Get a tasting session by ID."""
        return self.session.get(TastingSession, session_id)

    def update_session(
        self, session_id: int, data: TastingSessionUpdate
    ) -> Optional[TastingSession]:
        """Update a tasting session."""
        tasting_session = self.get_session(session_id)
        if not tasting_session:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(tasting_session, key, value)

        tasting_session.updated_at = datetime.utcnow()
        self.session.add(tasting_session)
        self.session.commit()
        self.session.refresh(tasting_session)
        return tasting_session

    def delete_session(self, session_id: int) -> bool:
        """Delete a tasting session and all its notes (cascade)."""
        tasting_session = self.get_session(session_id)
        if not tasting_session:
            return False

        self.session.delete(tasting_session)
        self.session.commit()
        return True

    def get_session_stats(self, session_id: int) -> dict:
        """Get statistics for a tasting session."""
        notes = self.get_notes_for_session(session_id)

        decision_counts = {"approved": 0, "needs_work": 0, "rejected": 0}
        for note in notes:
            if note.decision in decision_counts:
                decision_counts[note.decision] += 1

        return {
            "recipe_count": len(notes),
            "approved_count": decision_counts["approved"],
            "needs_work_count": decision_counts["needs_work"],
            "rejected_count": decision_counts["rejected"],
        }

    # -------------------------------------------------------------------------
    # Tasting Note Operations
    # -------------------------------------------------------------------------

    def add_note(
        self, session_id: int, data: TastingNoteCreate
    ) -> Optional[TastingNote]:
        """Add a tasting note to a session."""
        # Verify session exists
        tasting_session = self.get_session(session_id)
        if not tasting_session:
            return None

        # Verify recipe exists
        recipe = self.session.get(Recipe, data.recipe_id)
        if not recipe:
            return None

        # Check for duplicate (same recipe in same session)
        existing = self.session.exec(
            select(TastingNote).where(
                TastingNote.session_id == session_id,
                TastingNote.recipe_id == data.recipe_id,
            )
        ).first()

        if existing:
            return None  # Duplicate not allowed

        note = TastingNote(
            session_id=session_id,
            **data.model_dump(),
        )
        self.session.add(note)
        self.session.commit()
        self.session.refresh(note)
        return note

    def get_notes_for_session(self, session_id: int) -> list[TastingNote]:
        """Get all notes for a tasting session."""
        statement = (
            select(TastingNote)
            .where(TastingNote.session_id == session_id)
            .order_by(TastingNote.id)
        )
        return list(self.session.exec(statement).all())

    def get_note(self, note_id: int) -> Optional[TastingNote]:
        """Get a tasting note by ID."""
        return self.session.get(TastingNote, note_id)

    def update_note(
        self, note_id: int, data: TastingNoteUpdate
    ) -> Optional[TastingNote]:
        """Update a tasting note."""
        note = self.get_note(note_id)
        if not note:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(note, key, value)

        note.updated_at = datetime.utcnow()
        self.session.add(note)
        self.session.commit()
        self.session.refresh(note)
        return note

    def delete_note(self, note_id: int) -> bool:
        """Delete a tasting note."""
        note = self.get_note(note_id)
        if not note:
            return False

        self.session.delete(note)
        self.session.commit()
        return True

    # -------------------------------------------------------------------------
    # Recipe Tasting History
    # -------------------------------------------------------------------------

    def get_notes_for_recipe(self, recipe_id: int) -> list[TastingNoteWithRecipe]:
        """Get all tasting notes for a recipe, with session info."""
        statement = (
            select(TastingNote, TastingSession, Recipe)
            .join(TastingSession, TastingNote.session_id == TastingSession.id)
            .join(Recipe, TastingNote.recipe_id == Recipe.id)
            .where(TastingNote.recipe_id == recipe_id)
            .order_by(TastingSession.date.desc(), TastingNote.id.desc())
        )
        results = self.session.exec(statement).all()

        notes_with_info = []
        for note, session, recipe in results:
            note_dict = {
                "id": note.id,
                "session_id": note.session_id,
                "recipe_id": note.recipe_id,
                "taste_rating": note.taste_rating,
                "presentation_rating": note.presentation_rating,
                "texture_rating": note.texture_rating,
                "overall_rating": note.overall_rating,
                "feedback": note.feedback,
                "action_items": note.action_items,
                "decision": note.decision,
                "taster_name": note.taster_name,
                "created_at": note.created_at,
                "updated_at": note.updated_at,
                "recipe_name": recipe.name,
                "session_name": session.name,
                "session_date": session.date,
            }
            notes_with_info.append(TastingNoteWithRecipe(**note_dict))

        return notes_with_info

    def get_recipe_tasting_summary(self, recipe_id: int) -> RecipeTastingSummary:
        """Get aggregated tasting data for a recipe."""
        # Get all notes for recipe
        notes = self.session.exec(
            select(TastingNote, TastingSession)
            .join(TastingSession, TastingNote.session_id == TastingSession.id)
            .where(TastingNote.recipe_id == recipe_id)
            .order_by(TastingSession.date.desc())
        ).all()

        if not notes:
            return RecipeTastingSummary(
                recipe_id=recipe_id,
                total_tastings=0,
                average_overall_rating=None,
                latest_decision=None,
                latest_feedback=None,
                latest_tasting_date=None,
            )

        # Calculate average overall rating
        ratings = [n.overall_rating for n, _ in notes if n.overall_rating is not None]
        avg_rating = sum(ratings) / len(ratings) if ratings else None

        # Get latest note info
        latest_note, latest_session = notes[0]

        return RecipeTastingSummary(
            recipe_id=recipe_id,
            total_tastings=len(notes),
            average_overall_rating=round(avg_rating, 1) if avg_rating else None,
            latest_decision=latest_note.decision,
            latest_feedback=latest_note.feedback,
            latest_tasting_date=latest_session.date,
        )
