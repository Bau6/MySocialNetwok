package com.socialnetwork.repository;

import com.socialnetwork.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByPhone(String phone);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByPhone(String phone);
    boolean existsByEmail(String email);

    List<User> findByUsernameContainingOrPhoneContaining(String username, String phone);

    // ДОБАВЬТЕ ЭТОТ МЕТОД для поиска по частичному совпадению во всех полях
    @Query("SELECT u FROM User u WHERE " +
            "LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "u.phone LIKE CONCAT('%', :phone, '%') OR " +
            "LOWER(u.email) LIKE LOWER(CONCAT('%', :email, '%'))")
    List<User> searchUsers(@Param("search") String search,
                           @Param("phone") String phone,
                           @Param("email") String email);
}