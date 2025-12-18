//! Ring buffer pour historique output
//!
//! Buffer circulaire pour garder les N derniers bytes
//! du stream pour analyse contextuelle.

/// Buffer circulaire pour historique
pub struct RingBuffer {
    capacity: usize,
    data: Vec<u8>,
}

impl RingBuffer {
    /// Crée un nouveau buffer avec la capacité donnée
    pub fn new(capacity: usize) -> Self {
        Self {
            capacity,
            data: Vec::with_capacity(capacity),
        }
    }

    /// Ajoute des données au buffer
    pub fn push(&mut self, bytes: &[u8]) {
        for &byte in bytes {
            if self.data.len() >= self.capacity {
                self.data.remove(0);
            }
            self.data.push(byte);
        }
    }

    /// Retourne le contenu du buffer
    pub fn as_slice(&self) -> &[u8] {
        &self.data
    }

    /// Vide le buffer
    pub fn clear(&mut self) {
        self.data.clear();
    }
}
